// YouTube Data API v3 client.
//
// This is the app's entire content source — there is no catalog. Three things
// about the API shape the code here:
//
//  1. QUOTA IS THE BINDING CONSTRAINT. The daily allowance is 10,000 units and
//     a single search costs 100, so ~100 searches/day. The Home screen alone
//     renders several category rows, which would burn the day's quota in a
//     couple of dozen page loads. So every search result is cached in
//     localStorage with a long TTL, and the cache is checked before any request.
//  2. search.list DOES NOT RETURN DURATION, and it happily returns videos that
//     can't be embedded — which fail silently in the player. Both require a
//     second videos.list call, which costs only 1 unit for up to 50 ids.
//  3. Thumbnail URLs from the API point at i.ytimg.com, which is BLOCKED on
//     this network. They're rebuilt against img.youtube.com instead.

const API = "https://www.googleapis.com/youtube/v3";
const KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const CACHE_PREFIX = "drivecast:yt:";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h — content this evergreen doesn't need to be fresher.

/** Distinguishable failures so the UI can explain itself rather than just failing. */
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

export const isConfigured = () => Boolean(KEY);

// i.ytimg.com is unreachable here; img.youtube.com serves the same images.
export const thumbnailUrl = (videoId, quality = "hqdefault") =>
  `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;

/** ISO-8601 duration ("PT1H2M3S") -> whole minutes, rounded up so 40s reads 1. */
export function parseDurationToMinutes(iso) {
  if (!iso) return 0;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((v) => (v ? Number(v) : 0));
  const total = d * 1440 + h * 60 + min + s / 60;
  return total > 0 ? Math.max(1, Math.round(total)) : 0;
}

// Deterministic gradient per video so cards keep the app's look and a given
// video is always the same colour across sessions.
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

/* ------------------------------------------------------------------- http -- */

async function apiGet(path, params) {
  if (!KEY) {
    throw new YouTubeError(
      YT_ERROR.NO_KEY,
      "No YouTube API key configured. Add VITE_YOUTUBE_API_KEY to .env.local and restart the dev server."
    );
  }

  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", KEY);

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new YouTubeError(YT_ERROR.NETWORK, `Couldn't reach YouTube: ${err.message}`);
  }

  if (!res.ok) {
    let reason = "";
    let message = `YouTube API error ${res.status}`;
    try {
      const body = await res.json();
      reason = body?.error?.errors?.[0]?.reason ?? "";
      message = body?.error?.message ?? message;
    } catch {
      /* keep the status-based message */
    }

    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new YouTubeError(
        YT_ERROR.QUOTA,
        "YouTube's daily search quota is used up. Cached results still work; fresh searches resume tomorrow."
      );
    }
    if (reason === "keyInvalid" || res.status === 400) {
      throw new YouTubeError(YT_ERROR.BAD_KEY, `YouTube rejected the API key: ${message}`);
    }
    throw new YouTubeError(YT_ERROR.UNKNOWN, message);
  }

  return res.json();
}

/* ----------------------------------------------------------------- search -- */

/**
 * Search YouTube and return items in the shape the UI already consumes.
 *
 * Costs 101 quota units on a cache miss (100 search + 1 videos.list), 0 on a
 * hit. Videos that disallow embedding are dropped — they'd fail silently in
 * the player otherwise.
 */
export async function searchVideos(query, { maxResults = 12, category = null } = {}) {
  const trimmed = (query ?? "").trim();
  if (!trimmed) return [];

  const cacheKey = `${trimmed.toLowerCase()}|${maxResults}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached.map((v) => ({ ...v, category: category ?? v.category }));

  const search = await apiGet("search", {
    part: "snippet",
    type: "video",
    // Long-form teaching content, not Shorts.
    videoEmbeddable: "true",
    q: trimmed,
    maxResults: String(maxResults),
  });

  const ids = (search.items ?? []).map((i) => i.id?.videoId).filter(Boolean);
  if (!ids.length) return [];

  // One extra unit buys real durations plus a hard embeddable check.
  const details = await apiGet("videos", {
    part: "contentDetails,status,snippet",
    id: ids.join(","),
  });

  const items = (details.items ?? [])
    .filter((v) => v.status?.embeddable !== false && v.status?.privacyStatus === "public")
    .map((v) => ({
      // `id` doubles as the React key and the favorite key; for dynamic content
      // the video id *is* the identity.
      id: v.id,
      youtubeId: v.id,
      type: "lesson",
      title: v.snippet?.title ?? "Untitled",
      description: v.snippet?.description?.split("\n")[0] ?? "",
      host: v.snippet?.channelTitle ?? "",
      category,
      duration: parseDurationToMinutes(v.contentDetails?.duration),
      thumbnail: thumbnailUrl(v.id),
      gradient: gradientFor(v.id),
      publishedAt: v.snippet?.publishedAt ?? null,
    }))
    // Drop anything with no real duration (live streams, premieres).
    .filter((v) => v.duration > 0);

  cacheSet(cacheKey, items);
  return items;
}
