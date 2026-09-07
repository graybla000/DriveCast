import React, { useEffect, useState } from "react";
import { Play, Pause, X, AlertCircle, Maximize2, Minimize2 } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { cn } from "@/lib/utils";

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

  // Expanded video. The iframe is NOT moved or re-rendered elsewhere when this
  // flips — only the container's classes change, so the same DOM node grows.
  // Re-parenting it would destroy the YouTube player and stop playback.
  const [expanded, setExpanded] = useState(false);

  // Collapse on Escape, which is what a full-screen-ish overlay should honour.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Nothing to expand once the item is gone or it's audio-only.
  useEffect(() => {
    if (!nowPlaying || isAudioPlayback) setExpanded(false);
  }, [nowPlaying, isAudioPlayback]);

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
            /* The container is a fixed overlay when expanded and a thumbnail when
               not — same element either way, so the player is never rebuilt. */
            <div
              className={cn(
                "relative shrink-0 bg-black overflow-hidden [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:block",
                expanded
                  // Centred a little below the midpoint rather than dead centre:
                  // at 50% it sits visually high, since the eye reads the sticky
                  // header and bar above it as part of the layout.
                  ? "fixed inset-x-3 top-[56%] -translate-y-1/2 z-[60] aspect-video rounded-2xl shadow-2xl shadow-black/80 ring-1 ring-white/15 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[min(92vw,900px)]"
                  : "w-[92px] h-[52px] rounded-lg"
              )}
            >
              <div ref={playerContainerRef} className="w-full h-full" />

              {/* While collapsed this sits over the iframe to catch the tap —
                  an iframe swallows clicks, so the expand affordance can't be
                  behind it. Removed when expanded so YouTube's own controls
                  (including its native fullscreen) work normally. */}
              {!expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  aria-label="Expand video"
                  title="Expand video"
                  className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/10 transition-colors"
                >
                  <Maximize2 size={15} className="text-white drop-shadow" />
                </button>
              )}

              {expanded && (
                <button
                  onClick={() => setExpanded(false)}
                  aria-label="Shrink video"
                  className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-black/70 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <Minimize2 size={16} />
                </button>
              )}
            </div>
          )}

          {/* Backdrop, rendered as a sibling so it never wraps the player. */}
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              aria-label="Close expanded video"
              tabIndex={-1}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm cursor-default"
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
