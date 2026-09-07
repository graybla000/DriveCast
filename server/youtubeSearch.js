// Server-side YouTube search.
//
// This runs ONLY on the server so the API key never reaches the browser. The
// key is read from YOUTUBE_API_KEY — deliberately without Vite's `VITE_` prefix,
// because Vite inlines any VITE_-prefixed variable into the client bundle, which
// is exactly what we're avoiding.
//
// The same module backs both the production Express server and the Vite dev
// middleware, so dev and prod hit identical code.

const API = "https://www.googleapis.com/youtube/v3";

// Cache is shared across all visitors, which is the point: quota is per-key, not
// per-user, so one person's search warms it for everyone. A day matches how
// evergreen this content is — variety comes from shuffling a deep pool, not from
// re-fetching, so a longer life costs nothing in freshness.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// An empty result is usually a genuinely unlucky query, but it can also be a bad
// moment upstream. Kept briefly so one of those can't hold a category empty for a
// whole day — the same trap the podcast cache had.
const EMPTY_CACHE_TTL_MS = 10 * 60 * 1000;

// Every search is fetched at full depth regardless of what the caller asked for.
//
// search.list costs 100 units for 1 result or 50 — maxResults does not change the
// price. So keying the cache by maxResults meant the identical query, requested as
// 8 for a row and 50 for a trip, was paid for twice: 202 units for one search's
// worth of content. Fetching 50 once and slicing per caller makes those the same
// cache entry.
const FETCH_SIZE = 50;
const cache = new Map();

/** Failure kinds the client maps to specific messages. */
export const ERROR_KIND = {
  NO_KEY: "no_key",
  QUOTA: "quota",
  BAD_KEY: "bad_key",
  NETWORK: "network",
  UNKNOWN: "unknown",
};

export class SearchError extends Error {
  constructor(kind, message, status = 500) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

/** ISO-8601 duration ("PT1H2M3S") -> whole minutes, rounded up so 40s reads 1. */
export function parseDurationToMinutes(iso) {
  if (!iso) return 0;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((v) => (v ? Number(v) : 0));
  const total = d * 1440 + h * 60 + min + s / 60;
  return total > 0 ? Math.max(1, Math.round(total)) : 0;
}

// i.ytimg.com is unreachable on some corporate networks; img.youtube.com serves
// the same images and is more reliably reachable.
const thumbnailUrl = (videoId) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

function getKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new SearchError(
      ERROR_KIND.NO_KEY,
      "Server has no YOUTUBE_API_KEY configured. Set it in .env.local for local dev, or in the Render dashboard.",
      503
    );
  }
  return key;
}

async function apiGet(path, params) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", getKey());

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new SearchError(ERROR_KIND.NETWORK, `Couldn't reach YouTube: ${err.message}`, 502);
  }

  if (!res.ok) {
    let reason = "";
    let message = `YouTube API error ${res.status}`;
    try {
      const body = await res.json();
      reason = body?.error?.errors?.[0]?.reason ?? "";
      message = body?.error?.message ?? message;
    } catch {
      /* fall back to the status-based message */
    }

    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new SearchError(
        ERROR_KIND.QUOTA,
        "YouTube's daily search quota is used up. Cached results still work; fresh searches resume tomorrow.",
        429
      );
    }
    if (reason === "keyInvalid" || res.status === 400) {
      throw new SearchError(ERROR_KIND.BAD_KEY, `YouTube rejected the API key: ${message}`, 502);
    }
    throw new SearchError(ERROR_KIND.UNKNOWN, message, 502);
  }

  return res.json();
}

/**
 * Search YouTube, returning items ready for the UI.
 *
 * Costs 101 quota units on a cache miss (100 for search.list + 1 for
 * videos.list), 0 on a hit. The second call is not optional: search.list returns
 * neither duration nor a trustworthy embeddable flag, and a non-embeddable video
 * fails *silently* in the IFrame player.
 */
export async function searchVideos(query, { maxResults = 12 } = {}) {
  const trimmed = (query ?? "").trim();
  if (!trimmed) return [];

  const want = Math.min(FETCH_SIZE, Math.max(1, maxResults));

  // Keyed by query alone — see FETCH_SIZE above for why maxResults must not be
  // part of this.
  const cacheKey = trimmed.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < (hit.data.length ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS)) {
    return hit.data.slice(0, want);
  }

  const search = await apiGet("search", {
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    q: trimmed,
    maxResults: String(FETCH_SIZE),
  });

  const ids = (search.items ?? []).map((i) => i.id?.videoId).filter(Boolean);
  if (!ids.length) {
    cache.set(cacheKey, { at: Date.now(), data: [] });
    return [];
  }

  const details = await apiGet("videos", {
    part: "contentDetails,status,snippet",
    id: ids.join(","),
  });

  const items = (details.items ?? [])
    .filter((v) => v.status?.embeddable !== false && v.status?.privacyStatus === "public")
    .map((v) => ({
      id: v.id,
      youtubeId: v.id,
      type: "lesson",
      title: v.snippet?.title ?? "Untitled",
      description: v.snippet?.description?.split("\n")[0] ?? "",
      host: v.snippet?.channelTitle ?? "",
      duration: parseDurationToMinutes(v.contentDetails?.duration),
      thumbnail: thumbnailUrl(v.id),
      publishedAt: v.snippet?.publishedAt ?? null,
    }))
    // Drop live streams and premieres, which report no usable duration.
    .filter((v) => v.duration > 0);

  // The full fetch is cached; the caller gets only what it asked for.
  cache.set(cacheKey, { at: Date.now(), data: items });
  return items.slice(0, want);
}

/**
 * Request handler shared by the Express server and the Vite dev middleware.
 * Framework-agnostic on purpose: takes a URL, returns { status, body }.
 */
export async function handleSearchRequest(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const query = url.searchParams.get("q") ?? "";
  const maxResults = Number(url.searchParams.get("maxResults")) || 12;

  try {
    const videos = await searchVideos(query, { maxResults });
    return { status: 200, body: { videos } };
  } catch (err) {
    if (err instanceof SearchError) {
      return { status: err.status, body: { error: { kind: err.kind, message: err.message } } };
    }
    return {
      status: 500,
      body: { error: { kind: ERROR_KIND.UNKNOWN, message: err?.message ?? "Search failed" } },
    };
  }
}
