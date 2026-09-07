import React from "react";
import { Play, Pause, X, AlertCircle } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
};

// Persistent Continue Listening mini-player — pinned sticky right below the
// header. Hosts the YouTube player itself: this bar stays mounted across every
// route in AppLayout, so playback survives navigation. The video surface is
// deliberately visible — YouTube's terms require it, and hidden iframes get
// throttled by browsers.
export default function ContinueListeningBar() {
  const {
    nowPlaying,
    isPlaying,
    togglePlay,
    stopPlaying,
    progress,
    currentTime,
    duration,
    seekToPercent,
    playerError,
    playerContainerRef,
    isAudioPlayback,
  } = useAppStore();

  if (!nowPlaying) return null;

  // Before the player reports a duration, fall back to the resume hint stored
  // from the previous session so the bar isn't empty on reload.
  const shownProgress = duration ? progress : nowPlaying.progress ?? 0;

  const handleSeek = (event) => {
    if (!duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    seekToPercent(((event.clientX - rect.left) / rect.width) * 100);
  };

  return (
    <div className="sticky top-14 z-30 px-5 py-2.5 bg-background/60 backdrop-blur-md">
      <div className="mx-auto max-w-md">
        <div className="glass-surface hairline rounded-2xl p-2.5 flex items-center gap-3 shadow-lg shadow-black/30">
          {/* Audio has no visible surface, so show the episode artwork instead of
              an empty black box. Video keeps its iframe mount, which must stay
              visible: YouTube requires it and hidden iframes get throttled. */}
          {isAudioPlayback ? (
            <div className="w-[92px] h-[52px] rounded-lg overflow-hidden bg-muted shrink-0">
              {nowPlaying.thumbnail && (
                <img
                  src={nowPlaying.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
          ) : (
            <div
              ref={playerContainerRef}
              className="w-[92px] h-[52px] rounded-lg overflow-hidden bg-black shrink-0 [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:block"
            />
          )}

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-cyan-600 text-white shrink-0 active:scale-95 transition-transform"
          >
            {isPlaying && <span className="absolute inset-0 rounded-xl glow-accent animate-pulse" />}
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
              {isPlaying ? "Now Playing" : "Continue Listening"}
            </p>
            <p className="text-[13px] font-semibold truncate">{nowPlaying.title}</p>

            {playerError ? (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-destructive">
                <AlertCircle size={11} className="shrink-0" />
                <span className="truncate">{playerError}</span>
              </p>
            ) : (
              <>
                <div
                  onClick={handleSeek}
                  role="slider"
                  aria-label="Seek"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(shownProgress)}
                  className="mt-1 h-1.5 -my-0.5 py-0.5 rounded-full cursor-pointer group"
                >
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-400 transition-[width] duration-200"
                      style={{ width: `${shownProgress}%` }}
                    />
                  </div>
                </div>
                {duration > 0 && (
                  <div className="mt-0.5 flex justify-between text-[9px] tabular-nums text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            onClick={stopPlaying}
            aria-label="Stop"
            className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground active:scale-90 transition-transform shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
