import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Podcasts or videos — one choice, shared by every screen.
//
// This was local state in Home, which meant choosing Podcasts there had no effect
// anywhere else: the trip planner went on building routes out of YouTube videos,
// which is the wrong way round for a drive, since only audio keeps playing once the
// browser is backgrounded for navigation.
//
// Defaults to audio for the same reason: the app's purpose is listening while
// driving, and video can't do that.
const STORAGE_KEY = "drivecast:source";

export const SOURCES = { AUDIO: "audio", VIDEO: "video" };

export function useSource() {
  const [source, setSource] = useLocalStorage(STORAGE_KEY, SOURCES.AUDIO);

  const value = source === SOURCES.VIDEO ? SOURCES.VIDEO : SOURCES.AUDIO;

  return {
    source: value,
    isAudio: value === SOURCES.AUDIO,
    setSource: useCallback((next) => setSource(next === SOURCES.VIDEO ? SOURCES.VIDEO : SOURCES.AUDIO), [setSource]),
  };
}
