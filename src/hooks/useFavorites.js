import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Favorites store a SNAPSHOT of each video, not an id.
//
// They used to be ids pointing into a static ITEMS array. Now that content comes
// live from YouTube there is no array to resolve an id against, and a saved
// video has to survive without one — so the fields the UI needs are copied in at
// save time. A saved item therefore keeps working even if the video later leaves
// search results entirely.
const STORAGE_KEY = "drivecast:favorites";

const FIELDS = [
  "id",
  "youtubeId",
  "type",
  "title",
  "description",
  "host",
  "category",
  "duration",
  "thumbnail",
  "gradient",
];

const snapshot = (video) => {
  const out = {};
  for (const f of FIELDS) if (video[f] !== undefined) out[f] = video[f];
  out.savedAt = Date.now();
  return out;
};

export function useFavorites() {
  const [stored, setStored] = useLocalStorage(STORAGE_KEY, []);

  // Entries saved by the old id-only format are strings. They can't be resolved
  // to anything now, so drop them rather than render broken cards.
  const favorites = Array.isArray(stored) ? stored.filter((f) => f && typeof f === "object" && f.id) : [];

  const isFavorite = useCallback(
    (id) => favorites.some((f) => f.id === id),
    [favorites]
  );

  /** Takes the whole video, because saving needs more than its id. */
  const toggleFavorite = useCallback(
    (video) => {
      // Tolerate a bare id for removal — some call sites only have that.
      const id = typeof video === "string" ? video : video?.id;
      if (!id) return;

      setStored((prev) => {
        const list = Array.isArray(prev) ? prev.filter((f) => f && typeof f === "object" && f.id) : [];
        if (list.some((f) => f.id === id)) return list.filter((f) => f.id !== id);
        if (typeof video === "string") return list; // nothing to snapshot
        return [snapshot(video), ...list];
      });
    },
    [setStored]
  );

  const clearFavorites = useCallback(() => setStored([]), [setStored]);

  return { favorites, isFavorite, toggleFavorite, clearFavorites };
}
