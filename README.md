# DriveCast

Discover podcasts, places, and roadside gems worth the detour — a mobile-first
React app for finding something worth listening to on a drive.

## Run it

```bash
npm install
cp .env.local.example .env.local   # then paste in a YouTube API key
npm run dev
```

Then open **http://localhost:5173**. The dev server also serves `/api/search`,
so this is the only process you need.

Without a key the app still runs — every content row just explains that search
isn't configured. See `.env.local.example` for how to get one (Google Cloud →
enable "YouTube Data API v3" → create an API key). The dev server reads
`.env.local` only at startup, so restart it after adding the key.

To run the production build locally:

```bash
npm run build && npm start     # http://localhost:3000
```

## Deploying

Hosted on Render as a **Node web service** (not a static site) so the API key
stays server-side. `render.yaml` is a Blueprint — point Render at this repo and
it reads the config. The one thing it can't carry is the key itself: set
`YOUTUBE_API_KEY` in Render's Environment tab.

Render's free tier spins the service down when idle, so the first request after
a quiet spell takes about a minute to wake up.

## Scripts

| command | what it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the built `dist/` locally |
| `npm run lint` | eslint |

## How it works

DriveCast is a **thin client over YouTube**. It owns no content catalog: you
search, results come live from the YouTube Data API, they play in an embedded
player, and the only thing the app stores is what you choose to keep.

A single-page React app (React Router) with five screens: **Home**, **Explore**,
**Plan**, **Saved**, and **Profile**.

- **Content** is fetched live. `server/youtubeSearch.js` talks to the YouTube API
  (holding the key); `src/lib/youtube.js` is a thin client that calls this app's
  own `/api/search`; `src/hooks/useYouTubeSearch.js` wraps it in React Query.
- **Curation** is `src/lib/contentData.js`: categories are *saved queries*, not
  lists of videos. Editing a category's `query` changes what that topic returns.
- **State** is one shared store, `src/lib/AppStore.jsx`, composed from hooks in
  `src/hooks/`.
- **Persistence** is `localStorage` — favorites, saved trips, now-playing
  position, and recent searches survive a reload. Nothing leaves your machine.
  Saved items store a full snapshot of the video, so they keep working even if it
  later drops out of search results.
- **Playback** uses the YouTube IFrame Player API. The mini-player sits under the
  header and keeps playing as you move between screens.

### Changing what a category returns

Edit its `query` in `src/lib/contentData.js`. `FEATURED_CATEGORY_IDS` controls
which categories get their own row on Home — keep that list short, since each
row is a search.

## Known limits

- **Search quota.** The YouTube Data API allows 10,000 units/day and a search
  costs 100, so roughly **100 searches/day**. Results are cached in
  `localStorage` for 12h and searches are debounced to stay inside that; when the
  quota does run out the app says so plainly and cached results keep working.
- **Quota is shared by everyone using the deployed site**, since the server holds
  one key. The 12h server-side cache is what makes that workable.
- **Cold starts.** Render's free tier sleeps an idle service; the first visit
  after that waits ~1 minute. Cached results in the browser still render.
- **No background audio.** YouTube embeds pause when a mobile browser is
  backgrounded or the screen locks, and YouTube's terms require the player stay
  visible. Listening with the phone put away would need real audio files.
- **No accounts.** Every route is public and all state is per-browser.

## History

Originally built in base44. base44 was removed completely on 2026-09-06 — the
SDK, Vite plugin, hosted auth, and config are gone, and the app is plain
React + Vite. This project stays local: no remote, no hosted deployment.
