import React from "react";
import { Play, Pause, X } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";

// Persistent Continue Listening mini-player — pinned sticky right below the header.
export default function ContinueListeningBar() {
  const { nowPlaying, isPlaying, togglePlay, stopPlaying } = useAppStore();
  if (!nowPlaying) return null;

  const progress = nowPlaying.progress ?? 0;

  return (
    <div className="sticky top-14 z-30 px-5 py-2.5 bg-background/60 backdrop-blur-md">
      <div className="mx-auto max-w-md">
        <div className="glass-surface hairline rounded-2xl p-2.5 flex items-center gap-3 shadow-lg shadow-black/30">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-cyan-600 text-white shrink-0 active:scale-95 transition-transform"
          >
            {isPlaying && <span className="absolute inset-0 rounded-xl glow-accent animate-pulse" />}
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
              {isPlaying ? "Now Playing" : "Continue Listening"}
            </p>
            <p className="text-[13px] font-semibold truncate">{nowPlaying.title}</p>
            <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            onClick={stopPlaying}
            aria-label="Stop"
            className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground active:scale-90 transition-transform"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}