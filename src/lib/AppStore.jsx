import React, { createContext, useContext, useEffect, useRef } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { useContinueListening } from "@/hooks/useContinueListening";
import { useTheme } from "@/hooks/useTheme";
import { useTrips } from "@/hooks/useTrips";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useDriveTime } from "@/hooks/useDriveTime";
import { usePreferredCategories } from "@/hooks/usePreferredCategories";
import { useSector } from "@/hooks/useSector";
import { useSource } from "@/hooks/useSource";
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
  const prefs = usePreferredCategories();
  const sectorState = useSector();
  const sourceState = useSource();
  const [recentSearches, setRecentSearches] = useLocalStorage("drivecast:recent", RECENT_SEARCHES_DEFAULT);

  // Real playback, backed by the YouTube IFrame player. Progress and duration
  // come from the player itself rather than a timer, so the bar tracks the
  // actual video.
  const player = useYouTubePlayer();
  // Podcast episodes play through a real <audio> element instead, which is what
  // allows playback to continue when the browser is backgrounded.
  const audio = useAudioPlayer();
  const lastPersisted = useRef(0);

  // Which player owns the current item. Episodes carry an audioUrl; videos a
  // youtubeId. Everything below routes on this so the two can't fight.
  const isEpisode = (item) => Boolean(item?.audioUrl);
  const activeIsAudio = isEpisode(continueListening.nowPlaying);
  const active = activeIsAudio ? audio : player;

  // Mirror live progress into the stored nowPlaying record, so Continue
  // Listening survives a reload. Throttled — the player polls 4x/second and
  // localStorage writes are synchronous.
  //
  // Throttle on elapsed seconds, not percent: a percentage gate scales with
  // video length, so on a two-hour video a 2% step would only save every few
  // minutes and a reload would lose that much progress.
  useEffect(() => {
    if (!continueListening.nowPlaying || !active.currentTime) return;
    if (Math.abs(active.currentTime - lastPersisted.current) < 5) return;
    lastPersisted.current = active.currentTime;
    continueListening.savePosition({
      progress: active.progress,
      positionSeconds: active.currentTime,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.currentTime, continueListening.nowPlaying?.id]);

  /**
   * Start an item. Returns a promise resolving true once audio is genuinely
   * playing, which the trip planner waits on before handing off to a maps app.
   * Video resolves false immediately: an iframe can't play backgrounded at all,
   * so there is nothing to wait for.
   */
  const startPlaying = (item) => {
    continueListening.startPlaying(item);
    lastPersisted.current = 0;

    // Stop the other player first — two sources playing at once is the obvious
    // failure mode of having both.
    if (isEpisode(item)) {
      player.stop();
      return audio.load(item);
    }
    audio.stop();
    player.load(item.youtubeId);
    return Promise.resolve(false);
  };

  const togglePlay = () => {
    if (active.isPlaying) {
      active.pause();
      return;
    }
    // After a reload the bar is restored from localStorage but neither player
    // holds anything, so the first press has to reload and resume.
    const stored = continueListening.nowPlaying;
    if (activeIsAudio) {
      if (!audio.loadedUrl && stored?.audioUrl) {
        audio.load(stored, stored.positionSeconds ?? 0);
        return;
      }
    } else if (!player.loadedVideoId && stored?.youtubeId) {
      player.load(stored.youtubeId, stored.positionSeconds ?? 0);
      return;
    }
    active.play();
  };

  const stopPlaying = () => {
    player.stop();
    audio.stop();
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
    // Live player state, from whichever player owns the current item.
    // `progress` is the real 0–100 position; the stored nowPlaying.progress is
    // only the resume hint written between sessions.
    isPlaying: active.isPlaying,
    togglePlay,
    progress: active.progress,
    currentTime: active.currentTime,
    duration: active.duration,
    seekToPercent: active.seekToPercent,
    playerError: active.error,
    // Only the video player needs a mount point; audio has no visible surface.
    playerContainerRef: player.containerRef,
    // Lets the mini-player hide the video box when audio is playing.
    isAudioPlayback: activeIsAudio,
    /**
     * Buffer an episode ahead of playing it, so the tap that starts a drive doesn't
     * spend a second and a half fetching before any sound comes out.
     */
    prewarmAudio: audio.prewarm,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    // Set once in Profile; Home picks its rows from these and the trip planner
    // starts with them selected, so they're never entered twice.
    ...prefs,
    // Industry focus. Narrows the technical categories' searches; the others
    // ignore it.
    ...sectorState,
    // Podcasts vs videos, shared so the trip planner builds routes from whichever
    // the user picked rather than always reaching for video.
    ...sourceState,
    // Current drive. `driveMinutes` is the ceiling every content surface filters
    // against, so a video longer than the trip is never suggested.
    drive: driveTime.drive,
    driveMinutes: driveTime.driveMinutes,
    driveLoading: driveTime.isLoading,
    driveError: driveTime.error,
    lookupDrive: driveTime.lookupDrive,
    clearDrive: driveTime.clearDrive,
    isDriveActive: driveTime.isDriveActive,
    minutesRemaining: driveTime.minutesRemaining,
    locateMe: driveTime.locate,
    isLocating: driveTime.isLocating,
    locationError: driveTime.locationError,
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