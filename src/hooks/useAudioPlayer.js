import { useCallback, useEffect, useRef, useState } from "react";

// Plays podcast episodes with a real <audio> element.
//
// This is the whole reason the podcast source exists: an <audio> element keeps
// playing when the browser is backgrounded or the screen locks, so listening
// continues while Google Maps navigates in front. A YouTube iframe stops dead in
// that situation, which is what made the driving use case impossible.
//
// The element is created imperatively rather than rendered as JSX so it isn't
// tied to any component's lifecycle — a re-render or route change must never
// interrupt playback.

export function useAudioPlayer() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [loadedUrl, setLoadedUrl] = useState(null);

  /** Create the element once, on first use. */
  const element = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = "metadata";
    // Podcast MP3s are cross-origin; this keeps the request a simple one and
    // avoids needing CORS headers we don't control on every podcast host.
    audio.crossOrigin = null;

    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime || 0));
    audio.addEventListener("durationchange", () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    });
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", () => setIsPlaying(false));
    audio.addEventListener("error", () => {
      // Nearly always a dead enclosure URL or a host refusing the range request.
      setError("This episode's audio couldn't be loaded. The feed may be broken.");
      setIsPlaying(false);
    });

    audioRef.current = audio;
    return audio;
  }, []);

  useEffect(() => {
    return () => {
      // Leave nothing playing behind a closed tab.
      audioRef.current?.pause();
    };
  }, []);

  /**
   * Publish to the OS media session, which is what gives lock-screen and
   * CarPlay / Android Auto controls. Without this the audio plays but the phone
   * shows nothing to control it with.
   */
  const publishMediaSession = useCallback((episode) => {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: episode.title ?? "",
        artist: episode.host ?? "",
        album: "DriveCast",
        artwork: episode.thumbnail ? [{ src: episode.thumbnail, sizes: "512x512", type: "image/jpeg" }] : [],
      });
      navigator.mediaSession.setActionHandler("play", () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler("seekbackward", () => {
        if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
      });
      navigator.mediaSession.setActionHandler("seekforward", () => {
        if (audioRef.current) audioRef.current.currentTime += 30;
      });
    } catch {
      // MediaMetadata is unavailable on some browsers; playback still works.
    }
  }, []);

  /** Load and play an episode, optionally resuming at a position. */
  const load = useCallback(
    (episode, startSeconds = 0) => {
      if (!episode?.audioUrl) return;
      const audio = element();
      setError(null);

      if (audio.src !== episode.audioUrl) {
        audio.src = episode.audioUrl;
        setLoadedUrl(episode.audioUrl);
        setDuration(0);
      }
      if (startSeconds > 0) {
        // Seeking before metadata arrives is ignored, so wait for it.
        const seek = () => {
          audio.currentTime = startSeconds;
          audio.removeEventListener("loadedmetadata", seek);
        };
        audio.addEventListener("loadedmetadata", seek);
      }

      publishMediaSession(episode);
      // A play() rejection is normal when no user gesture has occurred yet.
      audio.play().catch(() => setIsPlaying(false));
    },
    [element, publishMediaSession]
  );

  const play = useCallback(() => audioRef.current?.play().catch(() => {}), []);
  const pause = useCallback(() => audioRef.current?.pause(), []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setLoadedUrl(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  const seekToPercent = useCallback((percent) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || !audio.duration) return;
    audio.currentTime = (Math.min(100, Math.max(0, percent)) / 100) * audio.duration;
  }, []);

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return {
    isPlaying,
    currentTime,
    duration,
    progress,
    error,
    loadedUrl,
    load,
    play,
    pause,
    stop,
    seekToPercent,
  };
}
