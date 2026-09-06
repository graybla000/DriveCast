import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Continue Listening: stores the single currently-playing item + progress (0–100).
export function useContinueListening() {
  const [nowPlaying, setNowPlaying] = useLocalStorage("drivecast:nowplaying", null);

  const startPlaying = useCallback(
    (item) => {
      setNowPlaying({ id: item.id, title: item.title, category: item.category, gradient: item.gradient, progress: 0 });
    },
    [setNowPlaying]
  );

  const setProgress = useCallback(
    (updater) => {
      setNowPlaying((prev) => {
        if (!prev) return prev;
        const next = typeof updater === "function" ? updater(prev.progress) : updater;
        return { ...prev, progress: Math.min(100, Math.max(0, next)) };
      });
    },
    [setNowPlaying]
  );

  const stopPlaying = useCallback(() => setNowPlaying(null), [setNowPlaying]);

  return { nowPlaying, startPlaying, setProgress, stopPlaying };
}