import React, { createContext, useContext, useEffect, useRef } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { useContinueListening } from "@/hooks/useContinueListening";
import { useTheme } from "@/hooks/useTheme";
import { useTrips } from "@/hooks/useTrips";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useDriveTime } from "@/hooks/useDriveTime";
import { RECENT_SEARCHES_DEFAULT } from "@/lib/contentData";

// Single source of truth shared across every screen. Swapping the hooks
// inside this provider (e.g. to entities/API) upgrades the whole app at once.
const AppStoreContext = createContext(null);

export function AppStoreProvider({ children }) {
  const theme = useTheme();
  const favorites = useFavorites();
  const continueListening = useContinueListening();
  const trips = useTrips();
  const driveTime = useDriveTime();
  const [recentSearches, setRecentSearches] = useLocalStorage("drivecast:recent", RECENT_SEARCHES_DEFAULT);

  // Real playback, backed by the YouTube IFrame player. Progress and duration
  // come from the player itself rather than a timer, so the bar tracks the
  // actual video.
  const player = useYouTubePlayer();
  const lastPersisted = useRef(0);

  // Mirror live progress into the stored nowPlaying record, so Continue
  // Listening survives a reload. Throttled — the player polls 4x/second and
  // localStorage writes are synchronous.
  //
  // Throttle on elapsed seconds, not percent: a percentage gate scales with
  // video length, so on a two-hour video a 2% step would only save every few
  // minutes and a reload would lose that much progress.
  useEffect(() => {
    if (!continueListening.nowPlaying || !player.currentTime) return;
    if (Math.abs(player.currentTime - lastPersisted.current) < 5) return;
    lastPersisted.current = player.currentTime;
    continueListening.savePosition({
      progress: player.progress,
      positionSeconds: player.currentTime,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentTime, continueListening.nowPlaying?.id]);

  const startPlaying = (item) => {
    continueListening.startPlaying(item);
    lastPersisted.current = 0;
    player.load(item.youtubeId);
  };

  const togglePlay = () => {
    if (player.isPlaying) {
      player.pause();
      return;
    }
    // After a reload the bar is restored from localStorage but the player holds
    // no video, so the first press has to load it and pick up where we left off.
    const stored = continueListening.nowPlaying;
    if (!player.loadedVideoId && stored?.youtubeId) {
      player.load(stored.youtubeId, stored.positionSeconds ?? 0);
      return;
    }
    player.play();
  };

  const stopPlaying = () => {
    player.stop();
    continueListening.stopPlaying();
  };

  const addRecentSearch = (q) => {
    const query = q.trim();
    if (!query) return;
    setRecentSearches((prev) => [query, ...prev.filter((s) => s.toLowerCase() !== query.toLowerCase())].slice(0, 8));
  };

  const clearRecentSearches = () => setRecentSearches([]);

  const value = {
    theme: theme.theme,
    toggleTheme: theme.toggleTheme,
    ...favorites,
    trips: trips.trips,
    saveTrip: trips.saveTrip,
    deleteTrip: trips.deleteTrip,
    nowPlaying: continueListening.nowPlaying,
    startPlaying,
    setProgress: continueListening.setProgress,
    stopPlaying,
    // Live player state. `progress` is the real 0–100 position; the stored
    // nowPlaying.progress is only the resume hint written between sessions.
    isPlaying: player.isPlaying,
    togglePlay,
    progress: player.progress,
    currentTime: player.currentTime,
    duration: player.duration,
    seekToPercent: player.seekToPercent,
    playerError: player.error,
    playerContainerRef: player.containerRef,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    // Current drive. `driveMinutes` is the ceiling every content surface filters
    // against, so a video longer than the trip is never suggested.
    drive: driveTime.drive,
    driveMinutes: driveTime.driveMinutes,
    driveLoading: driveTime.isLoading,
    driveError: driveTime.error,
    lookupDrive: driveTime.lookupDrive,
    clearDrive: driveTime.clearDrive,
    /** Videos that fit the current drive. Returns everything when no drive is set. */
    fitsDrive: (videos) =>
      driveTime.driveMinutes
        ? (videos ?? []).filter((v) => (v.duration ?? 0) <= driveTime.driveMinutes)
        : videos ?? [],
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}