/**
 * Fails the build if a secret ended up in the client bundle.
 *
 * This exists because the failure is silent and expensive: renaming the key to
 * VITE_YOUTUBE_API_KEY, or importing it into client code, would inline it into
 * dist/ and publish it to every visitor of the deployed site. Nothing else would
 * complain — the app would work perfectly.
 *
 * Runs automatically after `npm run build` (see the postbuild script).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");

const PATTERNS = [
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "VITE_ YouTube key reference", re: /VITE_YOUTUBE_API_KEY/ },
  // A bare googleapis.com call from the bundle means the client is talking to
  // YouTube directly again, which can only work with an exposed key.
  { name: "direct googleapis call", re: /googleapis\.com\/youtube/ },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error(`[check-no-secrets] No dist/ to check at ${DIST}`);
  process.exit(1);
}

const findings = [];
for (const file of files) {
  if (/\.(png|jpe?g|gif|webp|woff2?|ttf|eot|ico|mp4|webm)$/i.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const { name, re } of PATTERNS) {
    const match = text.match(re);
    if (match) {
      findings.push({ file: path.relative(DIST, file), name, sample: match[0].slice(0, 12) + "…" });
    }
  }
}

if (findings.length) {
  console.error("\n[check-no-secrets] FAILED — client bundle contains something it shouldn't:\n");
  for (const f of findings) console.error(`  ${f.file}: ${f.name} (${f.sample})`);
  console.error(
    "\nThe YouTube key must stay server-side (server/youtubeSearch.js, YOUTUBE_API_KEY).\n" +
      "Client code calls /api/search instead — see AGENTS.md.\n"
  );
  process.exit(1);
}

console.log(`[check-no-secrets] ok — scanned ${files.length} files in dist/, no secrets found`);
