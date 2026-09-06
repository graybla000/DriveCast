import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Favorites store an array of item ids. UI consumes toggle + check helpers.
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage("drivecast:favorites", []);

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback(
    (id) => {
      setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    },
    [setFavorites]
  );

  const clearFavorites = useCallback(() => setFavorites([]), [setFavorites]);

  return { favorites, isFavorite, toggleFavorite, clearFavorites };
}