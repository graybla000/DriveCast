#!/usr/bin/env node
// Warm the search cache for every category, then write the result to the seed
// file the server pre-loads at boot (server/cache-seed.json).
//
// Why this exists: the shared cache only covers queries somebody has actually
// browsed. A category nobody visited today has nothing cached, so when the daily
// quota runs out that category is empty for everyone — no row on Home, no route in
// the trip planner. Warming deliberately, once, while quota is available beats
// hoping the right pages got visited.
//
// Run it against a running server (dev or prod), since the server is what holds
// the API key:
//
//   node scripts/warm-cache.mjs                 # 21 plain category queries
//   node scripts/warm-cache.mjs --all           # + all 50 sector variants
//   node scripts/warm-cache.mjs --dry-run       # list what it would fetch
//   node scripts/warm-cache.mjs --base https://drivecast-5cx2.onrender.com
//
// Quota: a fresh search costs 101 units of the 10,000/day (100 search.list + 1
// videos.list), so --all is ~7,200 units and leaves little room for real use.
// Plain categories are ~2,100 and are the sane first pass.

import { readFileSync, writeFileSync } from "node:fs";
import { CATEGORIES, SECTORS, queryForCategory } from "../src/lib/contentData.js";

const SEED_PATH = new URL("../server/cache-seed.json", import.meta.url);
const CACHE_PREFIX = "drivecast:yt:";
const UNITS_PER_SEARCH = 101;
const PAUSE_MS = 250;

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const includeSectors = has("--all");
const dryRun = has("--dry-run");
const refresh = has("--refresh");
const base = valueOf("--base", "http://localhost:5173").replace(/\/$/, "");
const limit = Number(valueOf("--limit", "0")) || 0;

/** Every query the app can ask for, plain first so a partial run is still useful. */
function plannedQueries() {
  const out = CATEGORIES.map((c) => ({ label: c.id, query: queryForCategory(c.id) }));
  if (includeSectors) {
    for (const c of CATEGORIES) {
      if (!c.sectorAware || !c.sectorBase) continue;
      for (const s of SECTORS) out.push({ label: `${c.id}+${s.id}`, query: queryForCategory(c.id, s.id) });
    }
  }
  return out.filter((q) => q.query?.trim());
}

function readSeed() {
  try {
    return JSON.parse(readFileSync(SEED_PATH, "utf8"));
  } catch {
    return {};
  }
}

const seed = readSeed();
const planned = plannedQueries();
const todo = planned.filter((q) => refresh || !seed[CACHE_PREFIX + q.query.trim().toLowerCase()]);
const capped = limit ? todo.slice(0, limit) : todo;

console.log(`server:      ${base}`);
console.log(`planned:     ${planned.length} queries (${includeSectors ? "categories + sector variants" : "plain categories"})`);
console.log(`already in seed: ${planned.length - todo.length}`);
console.log(`to fetch:    ${capped.length}  (~${(capped.length * UNITS_PER_SEARCH).toLocaleString()} quota units)`);

if (dryRun) {
  for (const q of capped) console.log(`   ${q.label.padEnd(24)} "${q.query}"`);
  console.log("\n--dry-run: nothing fetched, seed not written.");
  process.exit(0);
}

let added = 0;
let alreadyCached = 0;
let failed = 0;
let spentUnits = 0;

for (const [i, q] of capped.entries()) {
  const url = `${base}/api/search?q=${encodeURIComponent(q.query)}&maxResults=50`;
  const progress = `[${i + 1}/${capped.length}]`;

  let res;
  let body;
  try {
    res = await fetch(url);
    body = await res.json();
  } catch (err) {
    console.log(`${progress} ${q.label}: request failed — ${err.message}`);
    failed++;
    continue;
  }

  if (body?.error) {
    console.log(`${progress} ${q.label}: ${body.error.kind} — ${body.error.message}`);
    failed++;
    // Nothing else will succeed today, and each attempt is a pointless round trip.
    if (body.error.kind === "quota") {
      console.log("\nQuota reached — stopping here. Re-run after it resets; work so far is kept.");
      break;
    }
    continue;
  }

  const videos = body?.videos ?? [];
  if (!videos.length) {
    console.log(`${progress} ${q.label}: no results`);
    continue;
  }

  // A stale answer is the cache or the seed talking, not a live search — including
  // the base-query fallback standing in for a sector variant. Storing it under this
  // key would duplicate content the seed already has under another one.
  if (body.stale) {
    console.log(`${progress} ${q.label}: already served from cache (${videos.length} videos), skipped`);
    alreadyCached++;
    continue;
  }

  seed[CACHE_PREFIX + q.query.trim().toLowerCase()] = { at: Date.now(), stale: false, data: videos };
  spentUnits += UNITS_PER_SEARCH;
  added++;
  console.log(`${progress} ${q.label}: ${videos.length} videos`);

  if (i < capped.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS));
}

if (added) {
  const ordered = Object.fromEntries(Object.keys(seed).sort().map((k) => [k, seed[k]]));
  writeFileSync(SEED_PATH, JSON.stringify(ordered, null, 2) + "\n");
}

const totalVideos = Object.values(seed).reduce((n, e) => n + (e.data?.length ?? 0), 0);
console.log(`
added:        ${added}
already warm: ${alreadyCached}
failed:       ${failed}
quota spent:  ~${spentUnits.toLocaleString()} units
seed now:     ${Object.keys(seed).length} queries, ${totalVideos} videos${added ? "" : " (unchanged)"}`);
if (added) console.log("\nCommit server/cache-seed.json to deploy it.");
