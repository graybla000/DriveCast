import React, { createContext, useContext, useEffect, useRef } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { useContinueListening } from "@/hooks/useContinueListening";
import { useTheme } from "@/hooks/useTheme";
import { useTrips } from "@/hooks/useTrips";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { RECENT_SEARCHES_DEFAULT } from "@/lib/contentData";

// Single source of truth shared across every screen. Swapping the hooks
// inside this provider (e.g. to entities/API) upgrades the whole app at once.
const AppStoreContext = createContext(null);

export function AppStoreProvider({ children }) {
  const theme = useTheme();
  const favorites = useFavorites();
  const continueListening = useContinueListening();
  const trips = useTrips();
  const [recentSearches, setRecentSearches] = useLocalStorage("drivecast:recent", RECENT_SEARCHES_DEFAULT);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const timerRef = useRef(null);

  // Simulated playback progress — drives the Continue Listening wave bar.
  useEffect(() => {
    if (isPlaying && continueListening.nowPlaying) {
      timerRef.current = setInterval(() => {
        continueListening.setProgress((p) => p + 0.4);
      }, 600);
      return () => clearInterval(timerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, continueListening.nowPlaying?.id]);

  // Auto-stop at end of track.
  useEffect(() => {
    if (continueListening.nowPlaying?.progress >= 100) {
      setIsPlaying(false);
    }
  }, [continueListening.nowPlaying?.progress]);

  const startPlaying = (item) => {
    continueListening.startPlaying(item);
    setIsPlaying(true);
  };

  const togglePlay = () => setIsPlaying((p) => !p);

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
    stopPlaying: continueListening.stopPlaying,
    isPlaying,
    togglePlay,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}