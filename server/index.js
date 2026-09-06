// Production server: serves the built app and proxies YouTube search so the API
// key stays server-side. Used by Render; locally `npm run dev` mounts the same
// search handler as Vite middleware instead (see vite.config.js).

import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleSearchRequest } from "./youtubeSearch.js";
import { handleRouteRequest } from "./driveTime.js";

const app = express();
const PORT = process.env.PORT || 3000;
// fileURLToPath rather than import.meta.dirname, which needs Node >= 20.11 and
// would fail on an older runtime.
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

app.get("/api/search", async (req, res) => {
  const { status, body } = await handleSearchRequest(req.originalUrl);
  // Let the browser and any CDN reuse a response for a while; the server's own
  // cache is the real quota guard, this just avoids redundant round trips.
  if (status === 200) res.set("Cache-Control", "public, max-age=1800");
  res.status(status).json(body);
});

app.get("/api/route", async (req, res) => {
  const { status, body } = await handleRouteRequest(req.originalUrl);
  // Shorter than search: traffic moves, so don't let a stale drive time stick.
  if (status === 200) res.set("Cache-Control", "public, max-age=300");
  res.status(status).json(body);
});

app.get("/healthz", (_req, res) => res.type("text").send("ok"));

if (!existsSync(DIST)) {
  console.error(`[server] No build found at ${DIST} — run \`npm run build\` first.`);
}

app.use(express.static(DIST, { index: false, maxAge: "1h" }));

// SPA fallback: the app uses client-side routing, so a deep link like /explore
// has no file on disk. Without this, refreshing any route but "/" 404s.
//
// Written as a final `app.use` rather than `app.get("*")` on purpose: Express 5
// uses path-to-regexp v8, where a bare "*" is no longer a valid pattern and
// throws at startup. This form works on both Express 4 and 5.
app.use((_req, res) => {
  res.sendFile(path.join(DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[server] listening on ${PORT}`);
  if (!process.env.YOUTUBE_API_KEY) {
    console.warn("[server] YOUTUBE_API_KEY is not set — search will return a configuration error.");
  }
});
