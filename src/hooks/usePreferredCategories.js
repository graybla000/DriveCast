import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Categories the user says they care about, set in Profile.
//
// Lives in the shared store rather than inside Profile so the rest of the app can
// honour it: Home picks its rows from this, and the trip planner starts with these
// interests pre-selected instead of asking again.
//
// Key is unchanged from when Profile owned this state, so existing selections
// carry over rather than being silently reset.
const STORAGE_KEY = "drivecast:preferredCats";

export function usePreferredCategories() {
  const [preferred, setPreferred] = useLocalStorage(STORAGE_KEY, []);

  const list = Array.isArray(preferred) ? preferred : [];

  const toggle = useCallback(
    (id) =>
      setPreferred((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      }),
    [setPreferred]
  );

  const clear = useCallback(() => setPreferred([]), [setPreferred]);

  return {
    preferredCategories: list,
    isPreferred: (id) => list.includes(id),
    togglePreferred: toggle,
    clearPreferred: clear,
  };
}
