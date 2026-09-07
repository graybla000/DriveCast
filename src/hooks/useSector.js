import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Industry sectors the user works in, chosen in Profile. Multi-select.
//
// Multiple sectors are handled as SEPARATE searches that get merged, not as one
// combined query. "aerospace automotive manufacturing" dilutes a search rather
// than narrowing it — YouTube offers no OR semantics to lean on — whereas
// "aerospace manufacturing" and "automotive manufacturing" run separately both
// return sharp results.
//
// That means each extra sector costs another search per sector-aware row, which is
// why the number used for fetching is capped (see MAX_SECTOR_FETCHES).
const STORAGE_KEY = "drivecast:sectors";

// Bounds quota. Each sector is a separate search per sector-aware row, so with 3
// Home rows this is 9 searches on a cold load (~909 of the 10,000 daily units).
// The 12h cache means that's per half-day rather than per visit, but the ceiling
// is what stops a longer list from quietly eating the day's allowance.
export const MAX_SECTOR_FETCHES = 3;

export function useSector() {
  const [stored, setStored] = useLocalStorage(STORAGE_KEY, []);

  const sectors = Array.isArray(stored) ? stored : [];

  const toggleSector = useCallback(
    (id) =>
      setStored((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      }),
    [setStored]
  );

  return {
    sectors,
    // The subset that actually drives searches, in selection order.
    activeSectors: sectors.slice(0, MAX_SECTOR_FETCHES),
    isSectorSelected: (id) => sectors.includes(id),
    toggleSector,
    clearSectors: useCallback(() => setStored([]), [setStored]),
  };
}
