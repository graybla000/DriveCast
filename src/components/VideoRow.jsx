import React, { useMemo } from "react";
import { AlertCircle, KeyRound } from "lucide-react";
import HorizontalScroller from "@/components/HorizontalScroller";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import { useAppStore } from "@/lib/AppStore";
import { seededShuffle, seedFrom } from "@/lib/shuffle";

// One horizontally scrolling row of live YouTube results for a single query.
//
// Owns its own fetch so each row loads independently — one row hitting the quota
// ceiling doesn't blank the whole screen.
export default function VideoRow({ query, category = null, maxResults = 50, show = 20 }) {
  const { startPlaying, fitsDrive, driveMinutes } = useAppStore();
  // 50 is deliberate and free: a search costs 100 quota units regardless of how
  // many results it asks for, so requesting the maximum buys a much deeper pool
  // at no extra cost — which is what makes varying the selection possible.
  const { videos: allVideos, isLoading, error, isMissingKey, isQuotaError } = useYouTubeSearch(query, {
    category,
    maxResults,
  });

  // Shuffled per page load so the same query doesn't show the same handful every
  // time. YouTube's relevance order is stable, and the results are cached for
  // 12h, so without this you'd see identical videos on every visit.
  const shuffled = useMemo(
    () => seededShuffle(allVideos, seedFrom(query)).slice(0, show),
    [allVideos, query, show]
  );

  // A drive time acts as a ceiling: nothing longer than the trip is shown.
  const videos = fitsDrive(shuffled);
  const hiddenByDrive = shuffled.length - videos.length;

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
    // Distinguish "nothing found" from "everything was too long for the drive",
    // which is an actionable difference.
    return (
      <p className="text-[13px] text-muted-foreground font-medium">
        {hiddenByDrive > 0
          ? `Nothing here fits a ${driveMinutes}-minute drive — ${hiddenByDrive} result${hiddenByDrive === 1 ? "" : "s"} were longer.`
          : "No results for this topic right now."}
      </p>
    );
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
