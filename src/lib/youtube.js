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

function cacheGet(key) {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL_MS) {
      window.localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Quota-full or private mode: caching is an optimisation, not a requirement.
  }
}

/**
 * Drop entries written under the old `query|maxResults` key format.
 *
 * They can never be read again, and each holds up to 50 videos — left alone they
 * would sit there until they expired, crowding a storage area that silently starts
 * throwing once it's full.
 */
(function pruneLegacyCacheKeys() {
  try {
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith(CACHE_PREFIX) && k.includes("|")) window.localStorage.removeItem(k);
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
  const cached = cacheGet(cacheKey);
  if (cached) return decorate(cached.slice(0, want), category);

  const url = `/api/search?q=${encodeURIComponent(trimmed)}&maxResults=${FETCH_SIZE}`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new YouTubeError(YT_ERROR.NETWORK, `Couldn't reach the search service: ${err.message}`);
  }

  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new YouTubeError(YT_ERROR.UNKNOWN, `Search service returned a non-JSON response (${res.status}).`);
  }

  if (!res.ok || payload.error) {
    const { kind = YT_ERROR.UNKNOWN, message = `Search failed (${res.status}).` } = payload.error ?? {};
    throw new YouTubeError(kind, message);
  }

  const videos = payload.videos ?? [];
  cacheSet(cacheKey, videos);
  return decorate(videos.slice(0, want), category);
}
