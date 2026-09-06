/**
 * Finds a real, embeddable YouTube video for each content item.
 *
 * Why this exists: hand-written video IDs rot (videos get deleted, made
 * private, or have embedding disabled by the owner) and a non-embeddable
 * video fails *silently* in the IFrame player — it just never starts. So
 * every candidate is verified through YouTube's oEmbed endpoint, which
 * returns 200 only for videos that are public AND embeddable.
 *
 * No API key required: search results are scraped and oEmbed is public.
 *
 *   node scripts/fetch-youtube-ids.mjs            # verify + write JSON
 *   node scripts/fetch-youtube-ids.mjs --dry-run  # print, write nothing
 *
 * Output: scripts/youtube-ids.json  (reviewed, then merged into contentData.js)
 */

import { readFileSync, writeFileSync } from "node:fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
const OUT = new URL("./youtube-ids.json", import.meta.url);

// One search query per content item. Tuned toward full-length educational
// material rather than shorts/clips.
const QUERIES = {
  it_01: "fall of rome documentary history",
  it_02: "black holes explained documentary",
  it_03: "cadillac ranch amarillo texas history",
  it_04: "emerald pool trail zion hike guide",
  it_05: "compound interest explained history of money",
  it_06: "museum of jurassic technology tour",
  it_07: "CRISPR gene editing explained",
  it_08: "mystery hole west virginia roadside attraction",
  it_09: "sunset ridge overlook hiking trail",
  it_10: "apollo program mission control documentary",
  it_11: "national air and space museum tour",
  it_12: "worlds largest ball of twine kansas",
  it_13: "psychology of pricing explained",
  it_14: "old growth forest cathedral grove documentary",
  it_15: "plate tectonics explained documentary",
  it_16: "wigwam village motel route 66 history",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch with retry + exponential backoff. Bulk scraping trips transient
 * network/rate-limit failures that look permanent but clear on retry, so a
 * single failed attempt must not condemn an item.
 */
async function fetchRetry(url, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(1500 * 2 ** i); // 1.5s, 3s, 6s
    }
  }
  throw lastErr;
}

/** Scrape candidate video IDs from a YouTube search results page, in rank order. */
async function searchCandidates(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await fetchRetry(url);
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const html = await res.text();

  const ids = [];
  for (const m of html.matchAll(/"videoId":"([\w-]{11})"/g)) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

/**
 * Confirm a video is public and embeddable, and get its real title/author.
 * oEmbed 200 => embeddable. 401/403 => embedding disabled. 404 => gone.
 */
async function verifyEmbeddable(videoId) {
  const url =
    "https://www.youtube.com/oembed?format=json&url=" +
    encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
  const res = await fetchRetry(url);
  if (!res.ok) return null;
  const data = await res.json();
  return { title: data.title, author: data.author_name };
}

const dryRun = process.argv.includes("--dry-run");
// --resume keeps already-verified entries and only retries what's missing,
// so a partial run isn't thrown away (and we don't re-hammer YouTube).
const resume = process.argv.includes("--resume");

let results = {};
if (resume) {
  try {
    results = JSON.parse(readFileSync(OUT, "utf8")).results ?? {};
    process.stdout.write(`--resume: keeping ${Object.keys(results).length} verified entries\n\n`);
  } catch {
    process.stdout.write("--resume: no existing output, starting fresh\n\n");
  }
}
const failures = [];

for (const [itemId, query] of Object.entries(QUERIES)) {
  if (resume && results[itemId]) continue;
  process.stdout.write(`${itemId}  "${query}"\n`);
  try {
    const candidates = await searchCandidates(query);
    if (!candidates.length) throw new Error("no candidates found");

    // Walk the ranked candidates until one verifies as embeddable.
    let picked = null;
    for (const videoId of candidates.slice(0, 6)) {
      const meta = await verifyEmbeddable(videoId);
      await sleep(200);
      if (meta) {
        picked = { youtubeId: videoId, ...meta };
        break;
      }
      process.stdout.write(`   skip ${videoId} (not embeddable)\n`);
    }

    if (!picked) throw new Error("no embeddable candidate in top 6");
    results[itemId] = picked;
    process.stdout.write(`   -> ${picked.youtubeId}  ${picked.title} [${picked.author}]\n`);
  } catch (err) {
    process.stdout.write(`   FAILED: ${err.message}\n`);
    failures.push({ itemId, query, error: err.message });
  }
  await sleep(400); // be polite to YouTube
}

process.stdout.write(
  `\nverified ${Object.keys(results).length}/${Object.keys(QUERIES).length}` +
    (failures.length ? `, ${failures.length} failed\n` : "\n")
);

if (dryRun) {
  process.stdout.write("--dry-run: nothing written\n");
} else {
  writeFileSync(OUT, JSON.stringify({ results, failures }, null, 2) + "\n");
  process.stdout.write(`wrote ${OUT.pathname}\n`);
}
