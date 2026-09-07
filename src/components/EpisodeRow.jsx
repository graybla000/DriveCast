import React from "react";
import { AlertCircle, Headphones } from "lucide-react";
import HorizontalScroller from "@/components/HorizontalScroller";
import { usePodcastSearch } from "@/hooks/usePodcastSearch";
import { useAppStore } from "@/lib/AppStore";

// A row of podcast episodes for one query — the audio counterpart to VideoRow.
//
// Episodes are the source that works while driving: they play through a real
// <audio> element, so playback continues when the browser is backgrounded and the
// phone shows lock-screen controls.
export default function EpisodeRow({ query, category = null, maxResults = 10 }) {
  const { startPlaying, fitsDrive, driveMinutes } = useAppStore();
  const { episodes: all, isLoading, error } = usePodcastSearch(query, { category, maxResults });

  const episodes = fitsDrive(all);
  const hiddenByDrive = all.length - episodes.length;

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
    return (
      <div className="flex items-start gap-2.5 p-3.5 rounded-2xl glass hairline">
        <AlertCircle size={16} className="text-destructive mt-0.5 shrink-0" />
        <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">{error.message}</p>
      </div>
    );
  }

  if (!episodes.length) {
    return (
      <p className="text-[13px] text-muted-foreground font-medium">
        {hiddenByDrive > 0
          ? `Nothing here fits a ${driveMinutes}-minute drive — ${hiddenByDrive} episode${hiddenByDrive === 1 ? "" : "s"} were longer.`
          : "No episodes found for this topic."}
      </p>
    );
  }

  return (
    <HorizontalScroller>
      {episodes.map((episode) => (
        <button
          key={episode.id}
          onClick={() => startPlaying(episode)}
          className="shrink-0 w-40 active:scale-[0.97] transition-transform text-left"
        >
          <div className="relative h-24 rounded-2xl overflow-hidden bg-muted">
            {episode.thumbnail ? (
              <img
                src={episode.thumbnail}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold uppercase tracking-wider">
              <Headphones size={9} /> Audio
            </div>
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold tabular-nums">
              {episode.duration} min
            </div>
          </div>
          <p className="text-[13px] font-semibold leading-tight mt-2 line-clamp-2">{episode.title}</p>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5 truncate">{episode.host}</p>
        </button>
      ))}
    </HorizontalScroller>
  );
}
