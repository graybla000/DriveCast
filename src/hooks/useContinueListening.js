import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Continue Listening: stores the single currently-playing item + progress (0–100).
export function useContinueListening() {
  const [nowPlaying, setNowPlaying] = useLocalStorage("drivecast:nowplaying", null);

  const startPlaying = useCallback(
    (item) => {
      setNowPlaying({
        id: item.id,
        title: item.title,
        category: item.category,
        gradient: item.gradient,
        // Needed to reload after a refresh, not just to start. One of these is
        // set depending on the source, and which one decides the player used.
        youtubeId: item.youtubeId,
        audioUrl: item.audioUrl,
        thumbnail: item.thumbnail,
        host: item.host,
        progress: 0,
      });
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

  /**
   * Record where playback actually is. Seconds are stored alongside the
   * percentage because resuming has to seek before the video's duration is
   * known, so a percentage on its own can't be converted back to a position.
   */
  const savePosition = useCallback(
    ({ progress, positionSeconds }) => {
      setNowPlaying((prev) =>
        prev ? { ...prev, progress: Math.min(100, Math.max(0, progress)), positionSeconds } : prev
      );
    },
    [setNowPlaying]
  );

  const stopPlaying = useCallback(() => setNowPlaying(null), [setNowPlaying]);

  return { nowPlaying, startPlaying, setProgress, savePosition, stopPlaying };
}