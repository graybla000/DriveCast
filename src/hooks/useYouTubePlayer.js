import { useCallback, useEffect, useRef, useState } from "react";

// Wraps the YouTube IFrame Player API in a single reusable player instance.
//
// Notes on the API's sharp edges, since they dictate the shape of this hook:
//  - The API loads via a global script that calls window.onYouTubeIframeAPIReady
//    exactly once, so loading is memoised in a module-level promise.
//  - YT.Player *replaces* the element you hand it with an <iframe>. Handing it a
//    React-managed node makes React and the API fight over the same DOM node, so
//    we append our own throwaway child inside the container instead.
//  - There is no time-update event; elapsed time has to be polled.
//  - The mount point is tracked as STATE via a callback ref, not a plain ref.
//    Playback is usually requested in the same click that first renders the
//    player's container, so the container does not exist yet when load() runs.
//    A plain ref wouldn't re-render, leaving the request stranded; state lets an
//    effect build the player the moment the container appears.

const POLL_MS = 250;

let apiPromise = null;

/** Load the IFrame API once per page and resolve with the global YT namespace. */
function loadYouTubeApi() {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load the YouTube IFrame API"));
    document.head.appendChild(script);
  });

  return apiPromise;
}

export function useYouTubePlayer() {
  const [containerEl, setContainerEl] = useState(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);
  // Video requested before the player could be built.
  const pendingRef = useRef(null);
  const buildingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  // Which video the player currently holds. Lets callers tell "paused" apart
  // from "nothing loaded yet" — the state after a page reload.
  const [loadedVideoId, setLoadedVideoId] = useState(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      setCurrentTime(player.getCurrentTime() ?? 0);
      const total = player.getDuration?.() ?? 0;
      if (total) setDuration(total);
    }, POLL_MS);
  }, [stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [stopPolling]);

  // Build the player as soon as both a container and a requested video exist.
  useEffect(() => {
    const pending = pendingRef.current;
    if (!containerEl || !pending || playerRef.current || buildingRef.current) return;

    buildingRef.current = true;
    let cancelled = false;

    (async () => {
      let YT;
      try {
        YT = await loadYouTubeApi();
      } catch (err) {
        setError(err.message);
        buildingRef.current = false;
        return;
      }

      if (cancelled || !containerEl.isConnected) {
        buildingRef.current = false;
        return;
      }

      // Give the API its own node so it isn't replacing one React manages.
      const mount = document.createElement("div");
      containerEl.appendChild(mount);

      playerRef.current = new YT.Player(mount, {
        width: "100%",
        height: "100%",
        videoId: pending.videoId,
        playerVars: {
          playsinline: 1, // don't hijack into iOS fullscreen
          rel: 0,
          modestbranding: 1,
          start: Math.floor(pending.startSeconds) || 0,
        },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration?.() ?? 0);
            event.target.playVideo?.();
          },
          onStateChange: (event) => {
            const state = event.data;
            if (state === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setDuration(event.target.getDuration?.() ?? 0);
              startPolling();
            } else {
              setIsPlaying(false);
              stopPolling();
              if (state === YT.PlayerState.ENDED) {
                setCurrentTime(event.target.getDuration?.() ?? 0);
              }
            }
          },
          // 101/150 mean the owner disabled embedding; 2 is a malformed id and
          // 5/100 are player/not-found errors. All of them look identical to the
          // user (nothing happens) unless surfaced.
          onError: (event) => {
            const messages = {
              2: "That video id looks invalid.",
              5: "The player can't play this video.",
              100: "That video is unavailable — it may have been removed.",
              101: "The owner of this video doesn't allow it to be embedded.",
              150: "The owner of this video doesn't allow it to be embedded.",
            };
            setError(messages[event.data] ?? `Playback error (code ${event.data}).`);
            setIsPlaying(false);
            stopPolling();
          },
        },
      });

      buildingRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
    // `loadedVideoId` re-runs this after a load() call that had no container yet.
  }, [containerEl, loadedVideoId, startPolling, stopPolling]);

  /**
   * Load and play a video, creating the player on first call.
   * `startSeconds` resumes mid-video (used to restore a saved position).
   */
  const load = useCallback((videoId, startSeconds = 0) => {
    if (!videoId) return;
    setError(null);
    setCurrentTime(startSeconds || 0);
    setDuration(0);
    pendingRef.current = { videoId, startSeconds };
    // Also the trigger for the build effect when the container isn't up yet.
    setLoadedVideoId(videoId);

    const player = playerRef.current;
    if (player?.loadVideoById) {
      player.loadVideoById({ videoId, startSeconds: Math.floor(startSeconds) || 0 });
    }
  }, []);

  const play = useCallback(() => playerRef.current?.playVideo?.(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo?.(), []);

  const stop = useCallback(() => {
    stopPolling();
    playerRef.current?.stopVideo?.();
    pendingRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    setLoadedVideoId(null);
  }, [stopPolling]);

  /** Seek to a 0–100 position, used by the progress bar. */
  const seekToPercent = useCallback((percent) => {
    const player = playerRef.current;
    const total = player?.getDuration?.() ?? 0;
    if (!player?.seekTo || !total) return;
    const clamped = Math.min(100, Math.max(0, percent));
    player.seekTo((clamped / 100) * total, true);
    setCurrentTime((clamped / 100) * total);
  }, []);

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return {
    // Assign with ref={containerRef} — it's a callback ref, see note above.
    containerRef: setContainerEl,
    isPlaying,
    currentTime,
    duration,
    progress,
    error,
    loadedVideoId,
    load,
    play,
    pause,
    stop,
    seekToPercent,
  };
}
