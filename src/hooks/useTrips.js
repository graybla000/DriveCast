import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Saved trips. Each trip: { id, destination, duration, interests, stops, createdAt }
export function useTrips() {
  const [trips, setTrips] = useLocalStorage("drivecast:trips", []);

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