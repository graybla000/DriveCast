import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Saved trips. Each trip: { id, destination, duration, interests, stops, createdAt }
//
// `stops` holds full video snapshots, not ids — same reason as favorites: there
// is no catalog to resolve an id against now that content is fetched live.
export function useTrips() {
  const [stored, setTrips] = useLocalStorage("drivecast:trips", []);

  // Trips saved under the old format have `stops` as an array of id strings,
  // which can no longer be resolved. Keep the trip, drop the dead stops.
  const trips = (Array.isArray(stored) ? stored : []).map((trip) => ({
    ...trip,
    stops: (trip.stops ?? []).filter((s) => s && typeof s === "object" && s.id),
  }));

  const saveTrip = useCallback(
    (trip) => {
      const record = { ...trip, id: `trip_${Date.now()}`, createdAt: Date.now() };
      setTrips((prev) => [record, ...prev]);
      return record;
    },
    [setTrips]
  );

  const deleteTrip = useCallback(
    (id) => setTrips((prev) => prev.filter((t) => t.id !== id)),
    [setTrips]
  );

  return { trips, saveTrip, deleteTrip };
}