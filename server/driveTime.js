// Server-side drive-time lookup via the Google Routes API.
//
// Runs on the server so the Maps key is never exposed, same as the YouTube one.
//
// Key resolution: GOOGLE_MAPS_API_KEY if set, otherwise YOUTUBE_API_KEY. One
// Google Cloud key can allow several APIs at once (Credentials -> API
// restrictions is a list), so a single key ticked for both YouTube Data API v3
// and Routes API is a perfectly good setup and needs no extra configuration.
// Set GOOGLE_MAPS_API_KEY only if you want the two separated — worth it mainly
// for independent rotation, since billing exposure is per-project either way.
//
// Two Routes API details that are easy to get wrong:
//  - X-Goog-FieldMask is REQUIRED. Omit it and every request fails with 400,
//    regardless of how correct the body is.
//  - The API needs billing enabled on the Google Cloud project even though the
//    monthly free credit covers light use. Without it you get a 403 that says
//    nothing obvious about billing, so it's mapped explicitly below.

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

// Routes are stable enough over short windows, and this protects both the bill
// and the response time when the same commute is checked repeatedly.
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — short, since traffic changes
const cache = new Map();

export const ROUTE_ERROR = {
  NO_KEY: "no_key",
  BILLING: "billing",
  API_DISABLED: "api_disabled",
  NOT_FOUND: "not_found",
  BAD_KEY: "bad_key",
  NETWORK: "network",
  UNKNOWN: "unknown",
};

export class RouteError extends Error {
  constructor(kind, message, status = 500) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

// "47.3809,-122.2348" — what the browser's Geolocation API gives us.
const COORD_RE = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/**
 * Routes API waypoints accept either a free-text address or explicit
 * coordinates. Sending coordinates when we have them avoids a geocoding step
 * (and a second API to enable), and is more precise than any address string.
 */
function toWaypoint(value) {
  const m = String(value).match(COORD_RE);
  if (!m) return { address: String(value) };

  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  // Out-of-range numbers are far more likely to be an address that happens to
  // look like a pair of numbers, so fall back rather than send a bad waypoint.
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return { address: String(value) };

  return { location: { latLng: { latitude, longitude } } };
}

/** "1234s" -> 1234 */
function parseDurationSeconds(value) {
  if (typeof value === "number") return value;
  const m = String(value ?? "").match(/^(\d+(?:\.\d+)?)s$/);
  return m ? Math.round(Number(m[1])) : 0;
}

export async function computeDriveTime(origin, destination) {
  const from = (origin ?? "").trim();
  const to = (destination ?? "").trim();
  if (!from || !to) {
    throw new RouteError(ROUTE_ERROR.NOT_FOUND, "Both a start and a destination are needed.", 400);
  }

  // Falls back to the YouTube key so a single multi-API key just works.
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new RouteError(
      ROUTE_ERROR.NO_KEY,
      "Drive times aren't configured. Set GOOGLE_MAPS_API_KEY, or allow the Routes API on the existing key, then set it in .env.local or the Render dashboard.",
      503
    );
  }

  const cacheKey = `${from.toLowerCase()}|${to.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        // Required — the request 400s without it.
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: toWaypoint(from),
        destination: toWaypoint(to),
        travelMode: "DRIVE",
        // Live traffic. TRAFFIC_AWARE needs no departureTime (it assumes now).
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
  } catch (err) {
    throw new RouteError(ROUTE_ERROR.NETWORK, `Couldn't reach the Routes API: ${err.message}`, 502);
  }

  if (!res.ok) {
    let message = `Routes API error ${res.status}`;
    let status = "";
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
      status = body?.error?.status ?? "";
    } catch {
      /* keep the status-based message */
    }

    const lower = message.toLowerCase();
    if (lower.includes("billing")) {
      throw new RouteError(
        ROUTE_ERROR.BILLING,
        "Google requires billing enabled on the project before the Routes API will answer. The free monthly credit covers light use, but a billing account must be attached.",
        402
      );
    }
    if (lower.includes("has not been used") || lower.includes("is disabled") || lower.includes("not enabled")) {
      throw new RouteError(
        ROUTE_ERROR.API_DISABLED,
        "The Routes API isn't enabled on this Google Cloud project yet. Enable 'Routes API', then retry.",
        403
      );
    }
    if (status === "PERMISSION_DENIED" || lower.includes("api key")) {
      throw new RouteError(
        ROUTE_ERROR.BAD_KEY,
        `Google rejected the key: ${message}. If this is the same key used for YouTube, add "Routes API" to its API restrictions in Google Cloud — a key restricted to one API is refused by the others.`,
        403
      );
    }
    throw new RouteError(ROUTE_ERROR.UNKNOWN, message, 502);
  }

  const body = await res.json();
  const route = body?.routes?.[0];

  // A 200 with no routes means the addresses were understood but not connectable
  // by road (or one couldn't be geocoded) — a normal outcome, not an error.
  if (!route) {
    throw new RouteError(
      ROUTE_ERROR.NOT_FOUND,
      "No driving route found between those places. Check the spelling, or add a city and state.",
      404
    );
  }

  const seconds = parseDurationSeconds(route.duration);
  const data = {
    origin: from,
    destination: to,
    durationSeconds: seconds,
    durationMinutes: Math.max(1, Math.round(seconds / 60)),
    distanceMeters: route.distanceMeters ?? 0,
    distanceMiles: route.distanceMeters ? Math.round((route.distanceMeters / 1609.344) * 10) / 10 : 0,
    fetchedAt: Date.now(),
  };

  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}

/** Framework-agnostic handler shared by the Express server and Vite middleware. */
export async function handleRouteRequest(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  try {
    const data = await computeDriveTime(url.searchParams.get("origin"), url.searchParams.get("destination"));
    return { status: 200, body: data };
  } catch (err) {
    if (err instanceof RouteError) {
      return { status: err.status, body: { error: { kind: err.kind, message: err.message } } };
    }
    return {
      status: 500,
      body: { error: { kind: ROUTE_ERROR.UNKNOWN, message: err?.message ?? "Drive time lookup failed" } },
    };
  }
}
