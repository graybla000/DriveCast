import React from "react";
import { Heart, Play, Clock } from "lucide-react";
import { TypeIcon } from "./CategoryIcon";
import { useAppStore } from "@/lib/AppStore";
import { cn } from "@/lib/utils";

// Compact list row for favorites, search results, trip suggestions.
export default function ItemRow({ item, onStart }) {
  const { isFavorite, toggleFavorite, startPlaying } = useAppStore();
  const saved = isFavorite(item.id);

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl glass hairline">
      <button
        onClick={() => (onStart ? onStart(item) : startPlaying(item))}
        className={cn("relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br shrink-0 active:scale-95 transition-transform", item.gradient)}
        aria-label="Play"
      >
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center text-white/90">
          {!item.thumbnail && <TypeIcon type={item.type} size={22} />}
        </div>
        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center">
          <Play size={20} fill="currentColor" className="text-white drop-shadow" />
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold leading-tight truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground font-semibold">
          {item.duration > 0 && (
            <span className="flex items-center gap-0.5"><Clock size={10} />{item.duration}m</span>
          )}
          {item.host && <span className="truncate">{item.host}</span>}
        </div>
      </div>

      <button
        onClick={() => toggleFavorite(item)}
        aria-label={saved ? "Remove from favorites" : "Save"}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform",
          saved ? "text-rose-400" : "text-muted-foreground"
        )}
      >
        <Heart size={20} fill={saved ? "currentColor" : "none"} />
      </button>
    </div>
  );
}