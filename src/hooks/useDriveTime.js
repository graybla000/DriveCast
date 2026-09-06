import { useCallback, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";

// The user's current drive, used as a ceiling on how long a video can be.
//
// The lookup runs on the server (/api/route) so the Maps key stays there; this
// hook only holds the result and the request state. The trip is persisted because
// a commute doesn't change between sessions — reopening the app on the same drive
// shouldn't mean re-entering it.

const STORAGE_KEY = "drivecast:drive";

const EMPTY = { origin: "", destination: "", durationMinutes: null, distanceMiles: null, fetchedAt: null };

export function useDriveTime() {
  const [drive, setDrive] = useLocalStorage(STORAGE_KEY, EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /** Look up a drive and store it. Returns the result, or null on failure. */
  const lookupDrive = useCallback(
    async (origin, destination) => {
      const from = (origin ?? "").trim();
      const to = (destination ?? "").trim();
      if (!from || !to) {
        setError({ kind: "not_found", message: "Enter both a start and a destination." });
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/route?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`
        );
        const payload = await res.json();

        if (!res.ok || payload.error) {
          setError(payload.error ?? { kind: "unknown", message: `Lookup failed (${res.status}).` });
          return null;
        }

        const next = {
          origin: payload.origin,
          destination: payload.destination,
          durationMinutes: payload.durationMinutes,
          distanceMiles: payload.distanceMiles,
          fetchedAt: payload.fetchedAt ?? Date.now(),
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

  return {
    drive,
    driveMinutes: drive?.durationMinutes ?? null,
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
    google: `https://www.google.com/maps/dir/?api=1&origin=${from}&destination=${to}&travelmode=driving`,
    // Apple uses saddr/daddr; dirflg=d selects driving.
    apple: `https://maps.apple.com/?saddr=${from}&daddr=${to}&dirflg=d`,
  };
}
