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

// How long to wait for playback to actually begin before giving up on confirming
// it. Only used to gate the hand-off to a maps app: past this the trip starts
// anyway, since stranding someone on a button is worse than starting silent.
//
// Measured, not guessed: a real episode took 1425ms to reach `playing` on a wired
// connection, most of it a tracking redirect (chtbl.com -> soundcloud) resolving
// before any audio arrived. A 2s cap expired before playback on two of three
// attempts, so it has room for a phone on cellular. `prewarm` below is what
// actually keeps the wait short; this is only the backstop.
const PLAY_START_TIMEOUT_MS = 6000;

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
    // "auto", not "metadata": the browser buffers real audio data as soon as a src
    // is set, so play() can start within the tap that requested it. With only
    // metadata preloaded, playback waited on a cross-origin MP3 fetch — long
    // enough that switching to a maps app suspended it before a sound was made.
    audio.preload = "auto";
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

  /**
   * Start buffering an episode without playing it.
   *
   * This is what makes the maps hand-off feel instant. Playback took ~1.4s from a
   * cold start, nearly all of it spent resolving redirects and fetching the first
   * bytes; doing that work while the user is still choosing their interests means
   * the eventual play() has data waiting and starts in milliseconds.
   *
   * Deliberately only touches a completely idle element. Replacing the src of
   * something playing would cut it off, and of something paused mid-episode would
   * throw away the listener's position.
   */
  const prewarm = useCallback(
    (episode) => {
      if (!episode?.audioUrl) return;
      const audio = element();
      if (audio.src === episode.audioUrl) return; // already warm
      if (!audio.paused || audio.currentTime > 0) return; // in use — leave it alone
      audio.src = episode.audioUrl;
      setLoadedUrl(episode.audioUrl);
      audio.load();
    },
    [element]
  );

  /**
   * Load and play an episode, optionally resuming at a position.
   *
   * Returns a promise resolving true once playback has ACTUALLY started — the
   * `playing` event, not the `play()` call. Callers that are about to send the
   * browser to the background need that distinction: a merely-requested play gets
   * suspended when the page is hidden, so the audio only appeared on coming back.
   * Resolves false on error or if it takes too long, so no caller can be stuck.
   */
  const load = useCallback(
    (episode, startSeconds = 0) => {
      if (!episode?.audioUrl) return Promise.resolve(false);
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

      const started = new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          audio.removeEventListener("playing", onPlaying);
          audio.removeEventListener("error", onError);
          clearTimeout(timer);
          resolve(ok);
        };
        const onPlaying = () => finish(true);
        const onError = () => finish(false);
        const timer = setTimeout(() => finish(false), PLAY_START_TIMEOUT_MS);
        audio.addEventListener("playing", onPlaying);
        audio.addEventListener("error", onError);
      });

      // A play() rejection is normal when no user gesture has occurred yet.
      audio.play().catch(() => setIsPlaying(false));
      return started;
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
    prewarm,
    play,
    pause,
    stop,
    seekToPercent,
  };
}
