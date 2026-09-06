# DriveCast

Discover podcasts, places, and roadside gems worth the detour — a mobile-first
React app for finding something worth listening to on a drive.

## Run it

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

That's the whole setup. There's no backend, no API keys, and no account needed.

## Scripts

| command | what it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the built `dist/` locally |
| `npm run lint` | eslint |

## How it works

A single-page React app (React Router) with five screens: **Home**, **Explore**,
**Plan**, **Saved**, and **Profile**.

- **Content** is static, in `src/lib/contentData.js`.
- **State** is one shared store, `src/lib/AppStore.jsx`, composed from hooks in
  `src/hooks/`.
- **Persistence** is `localStorage` — favorites, saved trips, now-playing
  position, and recent searches survive a reload. Nothing leaves your machine.
- **Playback** streams from YouTube via the IFrame Player API; every item in
  `contentData.js` has a `youtubeId`. The mini-player sits under the header and
  keeps playing as you move between screens.

### Adding or refreshing content

Video ids are fetched and verified rather than hand-written, because a video
that's been deleted or has embedding disabled fails silently in the player:

```bash
node scripts/fetch-youtube-ids.mjs    # find + verify embeddable videos
node scripts/merge-youtube-ids.mjs    # merge ids into contentData.js
```

Add an entry to the `QUERIES` map in `scripts/fetch-youtube-ids.mjs` first.

## Known limits

- **No background audio.** YouTube embeds pause when a mobile browser is
  backgrounded or the screen locks, and YouTube's terms require the player stay
  visible. Listening with the phone put away would need real audio files.
- **No accounts.** Every route is public and all state is per-browser.

## History

Originally built in base44. base44 was removed completely on 2026-09-06 — the
SDK, Vite plugin, hosted auth, and config are gone, and the app is plain
React + Vite. This project stays local: no remote, no hosted deployment.
