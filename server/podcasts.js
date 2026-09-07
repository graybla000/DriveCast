// Podcast search: Apple Podcasts directory for discovery, RSS feeds for episodes.
//
// Why this exists alongside the YouTube source: podcast feeds hand out real MP3
// URLs, so the app can be the player. That means audio keeps playing when the
// browser is backgrounded — which is what makes listening while Google Maps
// navigates possible. A YouTube embed stops the moment it loses the foreground.
//
// Two things worth knowing:
//  - The iTunes Search API needs NO key and has no quota, so none of the
//    YouTube quota machinery applies here.
//  - Feeds are fetched by URL, and those URLs come only from iTunes results —
//    never from the client. Accepting a caller-supplied feed URL would turn this
//    endpoint into an open proxy for fetching arbitrary hosts (SSRF).

import { XMLParser } from "fast-xml-parser";

const ITUNES_SEARCH = "https://itunes.apple.com/search";

// Feeds are large and change slowly; an hour is plenty and keeps this fast.
const CACHE_TTL_MS = 60 * 60 * 1000;

// Empty results get a much shorter life. An empty list is far more often a
// transient failure — a network blip, or every feed in one query exceeding its
// deadline at once — than a true "this topic has no podcasts". Storing that for a
// full hour turned one bad moment into an hour of "No episodes found" on the
// Engineering row, while the identical query answered fine on the next attempt.
// Still cached briefly, so a genuinely empty search doesn't hammer the directory.
const EMPTY_CACHE_TTL_MS = 60 * 1000;
const cache = new Map();
const CACHE_MAX = 200;

// How many shows to pull episodes from per query. Each is a separate feed fetch,
// so this trades breadth against latency — mitigated by fetching in parallel and
// giving each feed its own timeout, so one slow host can't hold up the rest.
const SHOWS_PER_QUERY = 12;
const EPISODES_PER_SHOW = 8;

// Some podcast hosts are slow or hang outright. Without a per-feed deadline a
// single bad one would stall the whole response.
const FEED_TIMEOUT_MS = 6000;

export const PODCAST_ERROR = {
  NETWORK: "network",
  UNKNOWN: "unknown",
};

export class PodcastError extends Error {
  constructor(kind, message, status = 500) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Feeds wrap descriptions in CDATA and repeat tags inconsistently; letting the
  // parser coerce values keeps the handling below simple.
  trimValues: true,
});

/**
 * itunes:duration is not a fixed format. Feeds use "3600", "45:30" or
 * "1:23:45" interchangeably, so all three are handled.
 */
export function parseEpisodeDuration(value) {
  if (value == null) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;

  if (/^\d+$/.test(raw)) return Math.max(1, Math.round(Number(raw) / 60)); // seconds

  const parts = raw.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  let seconds = 0;
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  else return 0;
  return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
}

/** Strip HTML from a feed description and shorten it to one readable line. */
function cleanText(value) {
  if (!value) return "";
  const text = typeof value === "string" ? value : (value["#text"] ?? "");
  return String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|amp|quot|#39|apos);/g, (m) =>
      ({ "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&#39;": "'", "&apos;": "'" })[m] ?? " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

/** Find shows in the Apple Podcasts directory. No key required. */
async function searchShows(query, limit) {
  const url = new URL(ITUNES_SEARCH);
  url.searchParams.set("media", "podcast");
  url.searchParams.set("entity", "podcast");
  url.searchParams.set("term", query);
  url.searchParams.set("limit", String(limit));

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new PodcastError(PODCAST_ERROR.NETWORK, `Couldn't reach the podcast directory: ${err.message}`, 502);
  }
  if (!res.ok) {
    throw new PodcastError(PODCAST_ERROR.UNKNOWN, `Podcast directory error ${res.status}`, 502);
  }

  const body = await res.json();
  return (body?.results ?? [])
    .filter((s) => s.feedUrl)
    .map((s) => ({
      showName: s.collectionName ?? s.trackName ?? "",
      author: s.artistName ?? "",
      feedUrl: s.feedUrl,
      artwork: s.artworkUrl600 ?? s.artworkUrl100 ?? null,
    }));
}

/** Fetch one feed and pull out playable episodes. */
async function fetchEpisodes(show) {
  let res;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), FEED_TIMEOUT_MS);
  try {
    res = await fetch(show.feedUrl, {
      headers: { "User-Agent": "DriveCast/1.0 (podcast client)" },
      redirect: "follow",
      signal: abort.signal,
    });
  } catch {
    return []; // a slow or broken feed shouldn't fail the whole search
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return [];

  let parsed;
  try {
    parsed = parser.parse(await res.text());
  } catch {
    return [];
  }

  const channel = parsed?.rss?.channel ?? parsed?.feed ?? {};
  const channelArt =
    channel["itunes:image"]?.["@_href"] ?? channel.image?.url ?? show.artwork ?? null;

  return asArray(channel.item)
    .map((item) => {
      // Per-item guard: feeds are third-party XML and a single malformed entry
      // must not take down the whole search. One bad pubDate used to throw
      // RangeError from toISOString() and fail the entire request with a 500.
      try {
        const enclosure = asArray(item.enclosure)[0];
        const audioUrl = enclosure?.["@_url"] ?? null;
        const type = enclosure?.["@_type"] ?? "";

        // Only audio enclosures are playable; some feeds attach video or PDFs.
        if (!audioUrl || (type && !type.startsWith("audio"))) return null;

        const duration = parseEpisodeDuration(item["itunes:duration"]);
        const id = item.guid?.["#text"] ?? item.guid ?? audioUrl;

        // Dates in the wild are frequently unparseable, so validate before
        // formatting. A missing date is fine; a crash is not.
        const published = item.pubDate ? new Date(item.pubDate) : null;
        const publishedAt =
          published && !Number.isNaN(published.getTime()) ? published.toISOString() : null;

        return {
          id: `pod_${String(id).replace(/[^\w-]/g, "").slice(-40)}`,
          type: "episode",
          title: cleanText(item.title) || "Untitled episode",
          description: cleanText(item["itunes:summary"] ?? item.description).slice(0, 220),
          host: show.showName || show.author,
          audioUrl,
          duration,
          thumbnail: item["itunes:image"]?.["@_href"] ?? channelArt,
          publishedAt,
        };
      } catch {
        return null; // skip this episode, keep the rest of the feed
      }
    })
    .filter(Boolean)
    // A duration is required: the whole point is fitting episodes to a drive,
    // and feeds that omit itunes:duration can't be placed.
    .filter((e) => e.duration > 0)
    .slice(0, EPISODES_PER_SHOW);
}

/**
 * Episodes matching a query, gathered across several shows.
 *
 * Costs nothing but time — no key, no quota. Cached because parsing several
 * feeds per query is the slow part.
 */
export async function searchEpisodes(query, { maxResults = 12 } = {}) {
  const trimmed = (query ?? "").trim();
  if (!trimmed) return [];

  const cacheKey = `${trimmed.toLowerCase()}|${maxResults}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < (hit.data.length ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS)) {
    return hit.data;
  }

  const shows = await searchShows(trimmed, SHOWS_PER_QUERY);
  // In parallel: several feeds sequentially would be noticeably slow.
  const perShow = await Promise.all(shows.map((s) => fetchEpisodes(s)));

  // Interleave shows rather than concatenating, so one prolific feed doesn't
  // fill the whole list.
  const episodes = [];
  for (let i = 0; i < EPISODES_PER_SHOW; i++) {
    for (const list of perShow) {
      if (list[i]) episodes.push(list[i]);
    }
  }

  const result = episodes.slice(0, maxResults);

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(cacheKey, { at: Date.now(), data: result });
  return result;
}

/** Framework-agnostic handler shared by the Express server and Vite middleware. */
export async function handlePodcastRequest(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  try {
    const episodes = await searchEpisodes(url.searchParams.get("q"), {
      maxResults: Number(url.searchParams.get("maxResults")) || 12,
    });
    return { status: 200, body: { episodes } };
  } catch (err) {
    if (err instanceof PodcastError) {
      return { status: err.status, body: { error: { kind: err.kind, message: err.message } } };
    }
    return {
      status: 500,
      body: { error: { kind: PODCAST_ERROR.UNKNOWN, message: err?.message ?? "Podcast search failed" } },
    };
  }
}
