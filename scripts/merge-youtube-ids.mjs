/**
 * Merges verified video ids from youtube-ids.json into src/lib/contentData.js
 * by inserting/updating a `youtubeId` field on each matching item.
 *
 * Idempotent: re-running updates existing youtubeId values in place rather
 * than adding duplicates, so it's safe to run after every fetch.
 *
 *   node scripts/merge-youtube-ids.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from "node:fs";

const DATA = new URL("../src/lib/contentData.js", import.meta.url);
const IDS = new URL("./youtube-ids.json", import.meta.url);

const dryRun = process.argv.includes("--dry-run");
const { results } = JSON.parse(readFileSync(IDS, "utf8"));
let source = readFileSync(DATA, "utf8");

let added = 0;
let updated = 0;
const missed = [];

for (const [itemId, { youtubeId }] of Object.entries(results)) {
  // Find this item's object literal: from its id up to the closing brace.
  const itemRe = new RegExp(`(id: "${itemId}",)([\\s\\S]*?)(\\n  \\},)`);
  const match = source.match(itemRe);
  if (!match) {
    missed.push(itemId);
    continue;
  }

  const [full, head, body, tail] = match;

  if (/youtubeId:/.test(body)) {
    const nextBody = body.replace(/youtubeId: "[^"]*"/, `youtubeId: "${youtubeId}"`);
    source = source.replace(full, `${head}${nextBody}${tail}`);
    updated++;
  } else {
    // Insert directly after the id line so it reads as identity, not metadata.
    source = source.replace(full, `${head}\n    youtubeId: "${youtubeId}",${body}${tail}`);
    added++;
  }
}

console.log(`added ${added}, updated ${updated}${missed.length ? `, MISSED: ${missed.join(", ")}` : ""}`);

if (dryRun) {
  console.log("--dry-run: nothing written");
} else {
  writeFileSync(DATA, source);
  console.log("wrote src/lib/contentData.js");
}
