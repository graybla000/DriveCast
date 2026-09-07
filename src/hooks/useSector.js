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

// Bounds quota: with 3 Home rows, 2 sectors is already 6 searches on a cold load.
export const MAX_SECTOR_FETCHES = 2;

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
