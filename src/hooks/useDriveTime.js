import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";

// The user's current drive, used as a ceiling on how long a video can be.
//
// The lookup runs on the server (/api/route) so the Maps key stays there; this
// hook only holds the result and the request state.
//
// A drive is treated as ACTIVE only while it could plausibly still be underway:
// from when it was looked up until its duration has elapsed, plus a grace window
// for traffic and stops. After that it expires by itself and stops filtering
// anything.
//
// Worth being clear about the limit: the browser cannot see whether you are
// actually navigating in Google or Apple Maps — no API exposes another app's
// turn-by-turn state. Elapsed time is the closest honest approximation. Tracking
// real movement would need the Geolocation API (permission prompt, battery cost).

const STORAGE_KEY = "drivecast:drive";

// Drives run long: traffic, a coffee stop. Better to keep filtering slightly too
// long than to drop it while someone is still in the car.
const GRACE_MS = 30 * 60 * 1000;

const EMPTY = {
  origin: "",
  destination: "",
  durationMinutes: null,
  distanceMiles: null,
  fetchedAt: null,
  startedAt: null,
};

const isStillUnderway = (drive) => {
  if (!drive?.durationMinutes || !drive?.startedAt) return false;
  return Date.now() < drive.startedAt + drive.durationMinutes * 60_000 + GRACE_MS;
};

export function useDriveTime() {
  const [drive, setDrive] = useLocalStorage(STORAGE_KEY, EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Expiry has to be re-evaluated over time, not just on interaction, or a drive
  // would keep filtering until the next click.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!drive?.durationMinutes) return;
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, [drive?.durationMinutes, drive?.startedAt]);

  const isDriveActive = isStillUnderway(drive);

  /**
   * Look up a drive and store it. Returns the result, or null on failure.
   * `originLabel` is what to display when the origin is raw coordinates —
   * "Current location" reads better than "47.38091,-122.23484".
   */
  const lookupDrive = useCallback(
    async (origin, destination, { originLabel, originPlaceId, destinationPlaceId } = {}) => {
      const from = (origin ?? "").trim();
      const to = (destination ?? "").trim();
      if (!from || !to) {
        setError({ kind: "not_found", message: "Enter both a start and a destination." });
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ origin: from, destination: to });
        // Place ids identify exactly what the user picked from the suggestions.
        if (originPlaceId) params.set("originPlaceId", originPlaceId);
        if (destinationPlaceId) params.set("destinationPlaceId", destinationPlaceId);

        const res = await fetch(`/api/route?${params}`);
        const payload = await res.json();

        if (!res.ok || payload.error) {
          setError(payload.error ?? { kind: "unknown", message: `Lookup failed (${res.status}).` });
          return null;
        }

        const next = {
          origin: payload.origin,
          originLabel: originLabel ?? null,
          destination: payload.destination,
          durationMinutes: payload.durationMinutes,
          distanceMiles: payload.distanceMiles,
          fetchedAt: payload.fetchedAt ?? Date.now(),
          // The clock the drive expires against.
          startedAt: Date.now(),
        };
        setDrive(next);
        return next;
      } catch (err) {
        setError({ kind: "network", message: `Couldn't reach the drive-time service: ${err.message}` });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [setDrive]
  );

  const clearDrive = useCallback(() => {
    setDrive(EMPTY);
    setError(null);
  }, [setDrive]);

  /**
   * Current position as a "lat,lng" string the route lookup accepts directly.
   *
   * Sent as coordinates rather than reverse-geocoded to an address: that would
   * need the Geocoding API enabled as well, and coordinates are more precise
   * anyway. The readable label is handled separately by the caller.
   *
   * Requires a secure context — HTTPS or localhost. Over plain HTTP the API is
   * simply absent, which is why that case is reported distinctly.
   */
  const locate = useCallback(
    () =>
      new Promise((resolve) => {
        if (!("geolocation" in navigator)) {
          setLocationError(
            window.isSecureContext === false
              ? "Location needs a secure connection (https). Open the site over https and try again."
              : "This browser doesn't support location."
          );
          resolve(null);
          return;
        }

        setIsLocating(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLocating(false);
            const { latitude, longitude } = pos.coords;
            resolve(`${latitude.toFixed(5)},${longitude.toFixed(5)}`);
          },
          (err) => {
            setIsLocating(false);
            const messages = {
              1: "Location permission was denied. Allow it in your browser's site settings, or type a start address instead.",
              2: "Your location isn't available right now. Type a start address instead.",
              3: "Finding your location timed out. Try again, or type a start address.",
            };
            setLocationError(messages[err.code] ?? err.message ?? "Couldn't get your location.");
            resolve(null);
          },
          // A stale fix is fine for "where am I starting from", and cheaper.
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 }
        );
      }),
    []
  );

  /** Minutes remaining, so the panel can count down rather than show a static figure. */
  const minutesRemaining = isDriveActive
    ? Math.max(
        0,
        Math.round((drive.startedAt + drive.durationMinutes * 60_000 - Date.now()) / 60_000)
      )
    : null;

  return {
    drive,
    isDriveActive,
    minutesRemaining,
    locate,
    isLocating,
    locationError,
    // Null unless a drive is actually underway, so an expired trip stops
    // filtering content on its own.
    driveMinutes: isDriveActive ? drive.durationMinutes : null,
    isLoading,
    error,
    lookupDrive,
    clearDrive,
  };
}

/**
 * Deep links into the native map apps. Free, no API, and the only way to get
 * Apple Maps involved without a paid Apple Developer account (its Server API
 * needs one; these URLs don't).
 */
export function mapLinks(origin, destination) {
  const from = encodeURIComponent((origin ?? "").trim());
  const to = encodeURIComponent((destination ?? "").trim());
  if (!to) return null;
  return {
    // dir_action=navigate starts turn-by-turn immediately on mobile rather than
    // showing the route for the user to tap Go on. On desktop it's ignored and
    // the route simply opens, which is the sensible fallback.
    google: `https://www.google.com/maps/dir/?api=1&origin=${from}&destination=${to}&travelmode=driving&dir_action=navigate`,
    // Apple uses saddr/daddr; dirflg=d selects driving. Apple's URL scheme has no
    // documented equivalent of dir_action=navigate, so this opens the route and
    // the driver taps Go — not something a different URL can fix.
    apple: `https://maps.apple.com/?saddr=${from}&daddr=${to}&dirflg=d`,
  };
}
