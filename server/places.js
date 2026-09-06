// Place autocomplete via the Google Places API (New), server-side so the key
// stays there.
//
// Cost matters here in a way it doesn't for the other endpoints: autocomplete is
// billed per request and a naive implementation fires one per keystroke. The
// client debounces and requires a minimum length; this side caches and caps
// results. The free monthly credit covers personal use, but the guards keep a
// stray render loop from becoming a bill.
//
// Requires "Places API (New)" enabled on the project — a different product from
// Routes API, so enabling one does not enable the other.

const ENDPOINT = "https://places.googleapis.com/v1/places:autocomplete";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — place names don't move
const CACHE_MAX = 500;
const cache = new Map();

export const PLACES_ERROR = {
  NO_KEY: "no_key",
  BILLING: "billing",
  API_DISABLED: "api_disabled",
  BAD_KEY: "bad_key",
  NETWORK: "network",
  UNKNOWN: "unknown",
};

export class PlacesError extends Error {
  constructor(kind, message, status = 500) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

// Below this, suggestions are noise and every keystroke is a paid request.
const MIN_INPUT = 3;

// Bias radius around the user, in metres.
//
// This value matters more than it looks, and small is right. Measured from
// Bonney Lake, WA searching "Fred Meyer": at 30km and 15km the local store 1.7mi
// away was NOT among Google's predictions at all; at 8km and 3km it was. The
// radius decides what Google *offers*, and sorting can only reorder what it
// returns — so too wide a radius makes the nearest place unreachable.
//
// A tight radius does not block distant destinations, because this is a bias and
// not a restriction: with 6km set, "Portland, OR" (118mi), "Grand Canyon"
// (924mi) and a Washington DC street address all still came back first for their
// queries.
//
// `origin` is sent alongside so each prediction carries distanceMeters, since a
// bias alone is prominence-weighted — a big store two towns over will outrank
// the local one without an explicit distance sort.
const BIAS_RADIUS_M = 6_000;

export async function autocompletePlaces(input, { lat, lng } = {}) {
  const query = (input ?? "").trim();
  if (query.length < MIN_INPUT) return [];

  const hasBias = Number.isFinite(lat) && Number.isFinite(lng);

  // The bias changes the results, so it has to be part of the cache identity —
  // otherwise an unbiased answer would be served to a located user.
  const cacheKey = hasBias
    ? `${query.toLowerCase()}@${lat.toFixed(2)},${lng.toFixed(2)}`
    : query.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new PlacesError(
      PLACES_ERROR.NO_KEY,
      "Place suggestions aren't configured. Set a Google key with Places API (New) enabled.",
      503
    );
  }

  const payload = { input: query };
  if (hasBias) {
    payload.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius: BIAS_RADIUS_M },
    };
    // Supplying `origin` is what makes each prediction include distanceMeters.
    // Without it there is no distance to sort by, and "nearest" is unknowable.
    payload.origin = { latitude: lat, longitude: lng };
  }

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new PlacesError(PLACES_ERROR.NETWORK, `Couldn't reach the Places API: ${err.message}`, 502);
  }

  if (!res.ok) {
    let message = `Places API error ${res.status}`;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
    } catch {
      /* keep the status-based message */
    }

    const lower = message.toLowerCase();
    if (lower.includes("billing")) {
      throw new PlacesError(
        PLACES_ERROR.BILLING,
        "Google requires billing enabled before the Places API will answer.",
        402
      );
    }
    if (lower.includes("has not been used") || lower.includes("is disabled") || lower.includes("not enabled")) {
      throw new PlacesError(
        PLACES_ERROR.API_DISABLED,
        "Enable 'Places API (New)' on this Google Cloud project — it's separate from the Routes API.",
        403
      );
    }
    if (lower.includes("blocked") || lower.includes("api key") || lower.includes("permission")) {
      throw new PlacesError(
        PLACES_ERROR.BAD_KEY,
        "The key doesn't allow the Places API. Add 'Places API (New)' to its API restrictions in Google Cloud.",
        403
      );
    }
    throw new PlacesError(PLACES_ERROR.UNKNOWN, message, 502);
  }

  const body = await res.json();
  let suggestions = (body?.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .map((p) => ({
      placeId: p.placeId ?? null,
      // Full label for display; the structured halves let the UI emphasise the name.
      description: p.text?.text ?? "",
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
      // Present only when `origin` was sent. Straight-line, not driving distance.
      distanceMeters: Number.isFinite(p.distanceMeters) ? p.distanceMeters : null,
      distanceMiles: Number.isFinite(p.distanceMeters)
        ? Math.round((p.distanceMeters / 1609.344) * 10) / 10
        : null,
    }))
    .filter((p) => p.description);

  // A tight bias can return the same place twice (observed at 3km).
  const seen = new Set();
  suggestions = suggestions.filter((s) => {
    const key = s.placeId ?? s.description;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Nearest first when distances are known. Google's own order is
  // prominence-weighted, which puts a big store two towns over above the local
  // one — the opposite of what someone starting a drive wants.
  if (hasBias && suggestions.some((s) => s.distanceMeters != null)) {
    suggestions.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  }

  suggestions = suggestions.slice(0, 6);

  // Crude bound so a long session can't grow the cache without limit.
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(cacheKey, { at: Date.now(), data: suggestions });

  return suggestions;
}

/** Framework-agnostic handler shared by the Express server and Vite middleware. */
export async function handlePlacesRequest(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  try {
    const suggestions = await autocompletePlaces(url.searchParams.get("q"), {
      lat: Number(url.searchParams.get("lat")),
      lng: Number(url.searchParams.get("lng")),
    });
    return { status: 200, body: { suggestions } };
  } catch (err) {
    if (err instanceof PlacesError) {
      return { status: err.status, body: { error: { kind: err.kind, message: err.message } } };
    }
    return {
      status: 500,
      body: { error: { kind: PLACES_ERROR.UNKNOWN, message: err?.message ?? "Autocomplete failed" } },
    };
  }
}
