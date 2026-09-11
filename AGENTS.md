# AGENTS.md

## Project Context

DriveCast is a React + Vite single-page app with a thin Node server. It started
life as a base44 project; base44 was removed entirely on 2026-09-06 (SDK, Vite
plugin, hosted auth, `base44/` config).

The server exists for exactly one reason: to hold the YouTube API key so it never
reaches the browser. Everything else is frontend, and all user state is
per-browser (`localStorage`) — there is no database and no auth.

Published at `github.com/graybla000/DriveCast` (**public**) and hosted on Render.
Because the repo is public, don't commit secrets and don't add employer-internal
detail (internal hostnames, registry URLs, network specifics) to tracked files.

It is an early project, well short of its intended feature set, so prefer
building the thing asked for over preserving existing scaffolding.

## Commands

```bash
npm run dev      # Vite dev server + /api/search middleware, localhost:5173
npm run build    # production build to dist/ (then checks for leaked secrets)
npm start        # production server (serves dist/ + /api/search), localhost:3000
npm run lint     # eslint
```

Only one dev server should run at a time. If port 5173 is "in use", Vite
silently takes 5174 and you end up looking at a stale app — kill the orphan
process rather than using the new port.

## Where things live

- `src/pages/` — the five routes: Home, Explore, TripPlanner, Favorites, Profile.
  All are public; there is no auth.
- `server/youtubeSearch.js` — **the content source**. Talks to the YouTube Data
  API and holds the key. Shared by the production Express server
  (`server/index.js`) and the Vite dev middleware in `vite.config.js`, so dev and
  prod run identical code.
- `src/lib/youtube.js` — thin client for this app's own `/api/search`. Contains
  no key and must never call googleapis.com directly.
- `src/lib/contentData.js` — the *curated* layer: categories as saved queries.
  There is no item catalog; nothing here lists videos.
- `src/hooks/useYouTubeSearch.js` — React Query wrappers (`useYouTubeSearch` for
  one query, `useYouTubeSearches` for several).
- `src/lib/AppStore.jsx` — single shared store (context) composed from the
  hooks in `src/hooks/`. Every screen reads state from here.
- `src/hooks/useYouTubePlayer.js` — the YouTube IFrame player wrapper.
- `src/components/ui/` — shadcn/ui primitives. Prefer composing these.
- `scripts/` — content tooling (see below).
- `src/App.jsx` — routes; `src/components/AppLayout.jsx` — the shared shell.

Persistence is `localStorage` only, via `src/hooks/useLocalStorage.js`
(favorites, trips, now-playing, recent searches).

## Playback

Audio/video comes from YouTube through the IFrame Player API. Each item in
`contentData.js` carries a `youtubeId`.

Two constraints worth knowing before changing this:

- **The player must stay visible.** YouTube's API terms require it, and hidden
  or zero-size iframes get throttled by browsers. `ContinueListeningBar` hosts
  the real player surface; don't hide it to make an audio-only player.
- **Background playback doesn't work.** Mobile browsers pause iframe audio when
  backgrounded or on screen lock, so "listen with the phone away" is not
  achievable with YouTube embeds. Real audio files would be needed for that.

The bar lives in `AppLayout` above `<main>`, which keeps it mounted across route
changes so playback survives navigation.

### Search and quota — read before touching the data layer

Content is fetched live from the YouTube Data API. The key is `YOUTUBE_API_KEY`
in `.env.local` locally, and a Render environment variable in production.

**Never rename it to `VITE_YOUTUBE_API_KEY` and never read it from client code.**
Vite inlines every `VITE_`-prefixed variable into the public bundle; the whole
point of the server endpoint is that the key isn't shipped to visitors. There's a
build-time check for this — see "Verifying the key stays server-side" below.

**Quota is the binding constraint**: 10,000 units/day, a search costs 100, so
~100 searches/day. Consequences to respect:

- Every search result is cached in `localStorage` for 12h by `src/lib/youtube.js`.
  Don't bypass that cache.
- Retries are disabled on search queries. Retrying a failure just burns quota.
- Typing is debounced before a query is committed — never search per keystroke.
- Each Home row is one search. Adding entries to `FEATURED_CATEGORY_IDS` costs
  quota on every cold load.
- `search.list` gives neither duration nor a reliable embeddable flag, so the
  client follows up with one `videos.list` call (1 unit for up to 50 ids) to get
  real durations and drop videos that can't be embedded — they fail silently in
  the player otherwise.

### Only medium-length videos

Searches send `videoDuration=medium`, so YouTube returns only 4–20 minute videos
(`SEARCH_DURATION` in `server/youtubeSearch.js`). This is something you start and
then drive: a one- or two-minute clip is over before it earns the reach, and an
unrestricted `type=video` search returns a great many of them.

Filtering at the API rather than on the results is the point. A search costs 100
units whether it returns 5 videos or 50, so a `medium` search yields ~50 usable
videos where an `any` search filtered afterwards yielded ~30 — same price,
two-thirds more content, and a deeper pool for rows and the Trip Planner.

`videoDuration` accepts **one** bucket — short (<4m) / medium (4–20m) / long
(>20m) — and only works alongside `type=video`. Two consequences to know before
changing it:

- **Videos over 20 minutes are excluded**, deliberately. Adding them back means a
  second `search.list` for the `long` bucket at another 100 units, halving the
  ~100 searches a day the quota allows. Don't do it casually.
- `DURATION_BUCKETS` in `src/lib/contentData.js` is sized to this range —
  under 8 / 8–12 / over 12, the terciles of what a `medium` search returns. Change
  the bucket here and those chips stop dividing anything; that's exactly how the
  old 20 / 60-minute boundaries ended up matching nothing.

`MIN_DURATION_MINUTES` (4) restates where `medium` starts, for the two paths the
API never touches:

- `loadSeed` — `cache-seed.json` was captured when searches were unrestricted and
  is ~35% shorts, so unfiltered it would serve them on exactly the days the seed
  is what's answering (cold start, spent quota);
- `present` in `src/lib/youtube.js` — `localStorage` entries written before this
  stay readable for `STALE_KEEP_MS` (30 days).

It's a floor and **not** a ceiling: long videos already cached stay usable, and
`seedPersist.js` gradually replaces the snapshot with medium-only results. In
`present`, filter **before** slicing to `maxResults` — slicing an old unfiltered
entry first spends a row's eight slots on shorts and then discards them.

The live-path `filter` after `videos.list` looks redundant now but isn't: live
streams and premieres satisfy the search and report `P0D`, which parses to 0.

### When the quota is gone

Running out is normal, not an error state, so nothing shows a warning if it can
avoid one. Both caches keep expired entries and fall back to them when a search
fails — quota spent, server asleep, no connection — and only a query with nothing
cached at all shows the "Daily quota reached" card. This is deliberately silent:
there is no "cached" badge, and no UI code is involved, because
`searchVideos` resolving with stale data is indistinguishable from a live result.

Two things to leave alone:

- Serving a stale entry must **not** refresh its timestamp. It has to stay
  expired, or the app stops trying live searches after the quota resets.
- The client's `pruneCache` is now the only thing that deletes entries (at 30
  days). Reads must not delete on expiry — that would throw the copy away exactly
  when it becomes useful.

A spent daily quota returns **HTTP 429 / `rateLimitExceeded` / RESOURCE_EXHAUSTED**,
not the documented `quotaExceeded`. Match all of them; matching only the
documented reason silently mislabels every quota failure as "Search failed".

### Pre-warming the server from a browser's cache

The server cache is in-memory, so a restart on a day whose quota is already spent
leaves it with nothing to serve. `server/cache-seed.json` (optional, git-tracked)
pre-warms it at boot. Export it from DevTools on a browser with a warm cache:

```js
copy(JSON.stringify(Object.fromEntries(
  Object.keys(localStorage)
    .filter((k) => k.startsWith('drivecast:yt:'))
    .map((k) => [k, JSON.parse(localStorage[k])])
), null, 2))
```

Paste into `server/cache-seed.json` and commit — it must be in the repo to reach
Render, whose filesystem doesn't survive a deploy. The loader strips the
`drivecast:yt:` prefix and stamps every entry as already expired, so a seeded
query is only ever a fallback and never suppresses a live search. Expect a few
hundred KB; it's public YouTube metadata, so nothing sensitive, but don't let it
grow unbounded.

Two less manual ways to fill it:

- `node scripts/warm-cache.mjs` walks every category query against a running
  server and merges the results into the seed. Plain categories are ~2,100 quota
  units; `--all` adds the sector variants for ~7,200 of the daily 10,000. It stops
  at the first quota error and skips queries the cache already answers.
- `server/seedPersist.js` commits newly warmed queries back to this file from the
  running server, so coverage grows from real browsing and survives spin-downs.
  It is **inert unless `GITHUB_TOKEN` is set** — local dev never commits anything.
  On Render, add `GITHUB_TOKEN` (fine-grained, Contents: read+write on this repo
  and nothing else); `SEED_REPO`, `SEED_BRANCH`, `SEED_PATH` and
  `SEED_COMMIT_INTERVAL_HOURS` override the defaults. Only *new* keys trigger a
  commit — refreshing an existing query would mean a commit every pass forever,
  for content that is evergreen by design.

### Verifying the key stays server-side

`npm run build` runs `scripts/check-no-secrets.mjs` afterwards, which fails the
build if `dist/` contains a Google API key pattern, a `VITE_YOUTUBE_API_KEY`
reference, or a direct `googleapis.com/youtube` call. The leak it guards against
is silent — the app would work fine while publishing the key to every visitor —
so don't remove or skip it.

`scripts/fetch-youtube-ids.mjs` and `merge-youtube-ids.mjs` are leftovers from
when the catalog was static. They're no longer part of the app's data path.

## The lockfile registry trap — check this after any dependency change

**`package-lock.json` must resolve every package from `registry.npmjs.org`.**

npm records the exact URL each tarball came from. This machine's npm is pointed at
a private corporate registry mirror, so a plain `npm install` here rewrites those
URLs to an internal host that **does not exist on the public internet**. The
deploy then hangs: `npm ci` waits on network timeouts for all ~690 packages,
producing *no log output at all*, until the build times out. It looks like a
frozen build, not a resolution failure, which is what makes it expensive to
diagnose. It also publishes an internal hostname into this public repo.

Check after adding, removing, or upgrading any dependency:

```bash
grep -oP '"resolved":\s*"https?://\K[^/]+' package-lock.json | sort -u
# must print only: registry.npmjs.org
```

If anything else appears, rewrite the prefix in place rather than regenerating the
lockfile — the mirror proxies npmjs, so the same version's tarball is identical
and every `integrity` hash stays valid, meaning no dependency versions drift:

```bash
node -e 'const f="package-lock.json",fs=require("fs");
fs.writeFileSync(f, fs.readFileSync(f,"utf8").split("<internal-prefix>").join("https://registry.npmjs.org/"))'
```

Then verify with a real install using a clean config, since this machine's npmrc
would otherwise mask the problem:

```bash
npm ci --include=dev --registry=https://registry.npmjs.org
```

## Thumbnails

Some corporate networks block `i.ytimg.com` (and `i9.ytimg.com`) while leaving
`img.youtube.com` reachable, so thumbnail URLs are always built as
`https://img.youtube.com/vi/<id>/hqdefault.jpg` rather than taken from the API
response. Every `<img>` also has an `onError` that hides it, leaving the card's
gradient as the fallback.

## Conventions

- `@/` path alias maps to `src/` — declared in `vite.config.js` (Vite) and
  `jsconfig.json` (editor). Both need it.
- Tailwind utility classes, with `cn()` from `@/lib/utils` for conditionals.
- `.jsx` for files containing JSX, `.js` for plain modules.
- Comments explain *why*, not what — match the existing density.
- Run `npm run build` before finishing; it catches import errors that the dev
  server's lazy transform can hide.
