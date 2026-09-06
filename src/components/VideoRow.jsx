import React from "react";
import { AlertCircle, KeyRound } from "lucide-react";
import HorizontalScroller from "@/components/HorizontalScroller";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import { useAppStore } from "@/lib/AppStore";

// One horizontally scrolling row of live YouTube results for a single query.
//
// Owns its own fetch so each row loads independently — one row hitting the quota
// ceiling doesn't blank the whole screen.
export default function VideoRow({ query, category = null, maxResults = 10 }) {
  const { startPlaying } = useAppStore();
  const { videos, isLoading, error, isMissingKey, isQuotaError } = useYouTubeSearch(query, {
    category,
    maxResults,
  });

  if (isLoading) {
    return (
      <div className="flex gap-3 -mx-5 px-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shrink-0 w-40 animate-pulse">
            <div className="h-24 rounded-2xl bg-muted" />
            <div className="h-3 rounded-full bg-muted mt-2" />
            <div className="h-3 w-2/3 rounded-full bg-muted mt-1.5" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    const Icon = isMissingKey ? KeyRound : AlertCircle;
    return (
      <div className="flex items-start gap-2.5 p-3.5 rounded-2xl glass hairline">
        <Icon size={16} className={isQuotaError ? "text-gold mt-0.5 shrink-0" : "text-destructive mt-0.5 shrink-0"} />
        <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">{error.message}</p>
      </div>
    );
  }

  if (!videos.length) {
    return <p className="text-[13px] text-muted-foreground font-medium">No results for this topic right now.</p>;
  }

  return (
    <HorizontalScroller>
      {videos.map((video) => (
        <button
          key={video.id}
          onClick={() => startPlaying(video)}
          className="shrink-0 w-40 active:scale-[0.97] transition-transform text-left"
        >
          <div className={`relative h-24 rounded-2xl overflow-hidden bg-gradient-to-br ${video.gradient}`}>
            <img
              src={video.thumbnail}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              // Thumbnails come from a host that can be blocked; the gradient
              // underneath is the fallback, so just hide a broken image.
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold tabular-nums">
              {video.duration} min
            </div>
          </div>
          <p className="text-[13px] font-semibold leading-tight mt-2 line-clamp-2">{video.title}</p>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5 truncate">{video.host}</p>
        </button>
      ))}
    </HorizontalScroller>
  );
}
