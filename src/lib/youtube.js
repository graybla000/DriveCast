// Client-side search: a thin fetch to this app's own /api/search endpoint.
//
// The YouTube API key is NOT here and never reaches the browser — the server
// holds it (see server/youtubeSearch.js). That endpoint exists in development
// too, mounted as Vite middleware, so this code path is identical either way.
//
// A localStorage cache still sits in front of it. The server's cache is what
// protects the API quota; this one just avoids repeat round trips (and keeps
// previously-seen results usable if the server is asleep, which Render's free
// tier does after a spell of inactivity).

const CACHE_PREFIX = "drivecast:yt:";
// Matches the server's cache life. Variety comes from shuffling a deep pool per
// session, not from re-fetching, so a longer life costs nothing in freshness.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// How long an expired entry is kept around *after* it stops counting as fresh.
// Past its TTL it can no longer answer a normal read, but it is still the
// fallback when a search fails, which is most of what makes a spent quota
// survivable. Only after this does it become genuine dead weight.
const STALE_KEEP_MS = 30 * 24 * 60 * 60 * 1000;

// Results the server itself served from *its* expired cache are held for minutes,
// not a day. Caching a stale echo for the full TTL would pin the app to a day-old
// view for another whole day, even though quota resets at midnight PT.
const STALE_ECHO_TTL_MS = 30 * 60 * 1000;

// Always ask the server for a full page. Costs no extra quota (the price is per
// search, not per result) and means one cache entry serves every caller.
const FETCH_SIZE = 50;

/** Failure kinds, mirroring the server's. */
export const YT_ERROR = {
  NO_KEY: "no_key",
  QUOTA: "quota",
  BAD_KEY: "bad_key",
  NETWORK: "network",
  UNKNOWN: "unknown",
};

export class YouTubeError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "YouTubeError";
    this.kind = kind;
  }
}

export const thumbnailUrl = (videoId, quality = "hqdefault") =>
  `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;

// Deterministic gradient per video so cards keep the app's look and a given
// video is always the same colour across sessions. Presentation only, so it
// lives on the client rather than in the API payload.
const GRADIENTS = [
  "from-sky-600 via-blue-800 to-indigo-900",
  "from-orange-600 via-amber-800 to-stone-900",
  "from-emerald-600 via-teal-800 to-slate-900",
  "from-indigo-600 via-violet-800 to-slate-900",
  "from-rose-600 via-red-800 to-amber-900",
  "from-cyan-600 via-sky-800 to-slate-900",
  "from-slate-500 via-slate-700 to-slate-900",
  "from-fuchsia-600 via-purple-800 to-indigo-900",
];

export function gradientFor(videoId = "") {
  let hash = 0;
  for (let i = 0; i < videoId.length; i++) hash = (hash * 31 + videoId.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

/* ---------------------------------------------------------------- caching -- */

/**
 * Read an entry without judging its age — `{ at, data, stale }` or null.
 *
 * Expiry deliberately doesn't delete anything here. An expired entry is exactly
 * what a failed search falls back on, and dropping it on read would throw away
 * the copy at the moment it becomes most useful. `pruneCache` below does the
 * eventual clearing out.
 */
function cacheEntry(key) {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { at, data, stale = false } = JSON.parse(raw);
    return Array.isArray(data) ? { at, data, stale } : null;
  } catch {
    return null;
  }
}

const isFresh = (entry) => Date.now() - entry.at < (entry.stale ? STALE_ECHO_TTL_MS : CACHE_TTL_MS);

function cacheSet(key, data, { stale = false } = {}) {
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data, stale }));
  } catch {
    // Quota-full or private mode: caching is an optimisation, not a requirement.
  }
}

/**
 * Clear out entries that can no longer be of use to anyone:
 *
 * - those written under the old `query|maxResults` key format, which can never be
 *   read again;
 * - those older than `STALE_KEEP_MS`, too old even to be a fallback.
 *
 * Each holds up to 50 videos, so left alone they crowd a storage area that
 * silently starts throwing once it's full. This runs on load because nothing
 * else reads a key it will never ask for again.
 */
(function pruneCache() {
  try {
    const now = Date.now();
    for (const k of Object.keys(window.localStorage)) {
      if (!k.startsWith(CACHE_PREFIX)) continue;
      if (k.includes("|")) {
        window.localStorage.removeItem(k);
        continue;
      }
      const entry = cacheEntry(k.slice(CACHE_PREFIX.length));
      if (!entry || now - entry.at > STALE_KEEP_MS) window.localStorage.removeItem(k);
    }
  } catch {
    // Private mode or no storage: nothing to prune.
  }
})();

/** Wipe cached searches. Exposed so the UI can offer a manual refresh. */
export function clearSearchCache() {
  try {
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith(CACHE_PREFIX)) window.localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/* ----------------------------------------------------------------- search -- */

const decorate = (videos, category) =>
  videos.map((v) => ({ ...v, category, gradient: gradientFor(v.youtubeId ?? v.id) }));

/** Search via the app's own endpoint. Returns items ready for the UI. */
export async function searchVideos(query, { maxResults = 12, category = null } = {}) {
  const trimmed = (query ?? "").trim();
  if (!trimmed) return [];

  // Keyed by query alone, and always fetched at full depth.
  //
  // The key used to include maxResults, so the same query asked for as 8 (a row)
  // and 50 (a trip) were separate entries — two paid searches for one search's
  // worth of content, since search.list costs 100 units whether it returns 5
  // results or 50. One entry now serves every caller, sliced to what it wants.
  const cacheKey = trimmed.toLowerCase();
  const want = Math.min(FETCH_SIZE, Math.max(1, maxResults));
  const entry = cacheEntry(cacheKey);
  if (entry && isFresh(entry)) return decorate(entry.data.slice(0, want), category);

  // An expired entry is still the best answer available if the search below fails
  // — a spent daily quota, a sleeping server, no connection. Falling back to it is
  // what keeps the screen full of content instead of a column of error cards, so
  // every failure path goes through here rather than throwing directly.
  const orStale = (err) => {
    if (entry?.data.length) return decorate(entry.data.slice(0, want), category);
    throw err;
  };

  const url = `/api/search?q=${encodeURIComponent(trimmed)}&maxResults=${FETCH_SIZE}`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    return orStale(new YouTubeError(YT_ERROR.NETWORK, `Couldn't reach the search service: ${err.message}`));
  }

  let payload;
  try {
    payload = await res.json();
  } catch {
    return orStale(
      new YouTubeError(YT_ERROR.UNKNOWN, `Search service returned a non-JSON response (${res.status}).`)
    );
  }

  if (!res.ok || payload.error) {
    const { kind = YT_ERROR.UNKNOWN, message = `Search failed (${res.status}).` } = payload.error ?? {};
    return orStale(new YouTubeError(kind, message));
  }

  const videos = payload.videos ?? [];
  // `payload.stale` means the server answered from its own expired cache, so this
  // isn't a live result and shouldn't be held like one — see STALE_ECHO_TTL_MS.
  cacheSet(cacheKey, videos, { stale: payload.stale === true });
  return decorate(videos.slice(0, want), category);
}
