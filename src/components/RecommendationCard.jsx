import React from "react";
import { motion } from "framer-motion";
import { Heart, Share2, Play, Clock, MapPin, Star } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { cn } from "@/lib/utils";

const TYPE_LABEL = {
  podcast: "Podcast episode",
  attraction: "Roadside attraction",
  trail: "Hiking trail",
  museum: "Museum",
};

// Swipeable recommendation card. Parent controls visibility via `active` and
// handles `onSwipe('like' | 'skip')` and `onSave`.
export default function RecommendationCard({ item, active, onSwipe, onSave, onShare, onStart }) {
  const { isFavorite } = useAppStore();
  const saved = isFavorite(item.id);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 120) onSwipe("like");
    else if (info.offset.x < -120) onSwipe("skip");
  };

  return (
    <motion.div
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={false}
      animate={{ x: 0, opacity: 1, scale: active ? 1 : 0.94, y: active ? 0 : 8 }}
      whileTap={{ cursor: "grabbing" }}
      className={cn(
        "absolute inset-0 rounded-[28px] overflow-hidden glass-surface hairline shadow-2xl shadow-black/50",
        !active && "pointer-events-none"
      )}
    >
      <div className="relative h-56 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
        <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.5), transparent 60%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider">
          {TYPE_LABEL[item.type]}
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md text-white text-[12px] font-bold">
          <Star size={13} className="text-gold fill-gold" /> {item.rating.toFixed(1)}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 text-white text-[12px] font-semibold">
          <span className="flex items-center gap-1"><Clock size={13} /> {item.duration} min</span>
          {item.distance != null && <span className="flex items-center gap-1"><MapPin size={13} /> {item.distance} mi away</span>}
          {item.location && <span className="truncate opacity-80">· {item.location}</span>}
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-display text-[22px] font-extrabold tracking-tight leading-tight">{item.title}</h3>
        {item.host && <p className="text-accent text-[12px] font-semibold mt-1">Hosted by {item.host}</p>}
        <p className="text-muted-foreground text-[14px] font-medium leading-relaxed mt-2 line-clamp-3">{item.description}</p>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {item.kidFriendly && <span className="px-2.5 py-1 rounded-full bg-accent/15 text-accent text-[11px] font-bold">Kid friendly</span>}
          {item.free ? <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-bold">Free</span> : <span className="px-2.5 py-1 rounded-full bg-gold/15 text-gold text-[11px] font-bold">Paid</span>}
          <span className="px-2.5 py-1 rounded-full glass hairline text-muted-foreground text-[11px] font-bold capitalize">{item.setting}</span>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={onStart}
            className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-accent to-cyan-500 text-accent-foreground font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Play size={20} fill="currentColor" className="ml-0.5" /> Start listening
          </button>
          <button
            onClick={onSave}
            aria-label={saved ? "Remove from favorites" : "Save"}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-transform hairline",
              saved ? "bg-rose-500/20 text-rose-400" : "glass text-muted-foreground"
            )}
          >
            <Heart size={22} fill={saved ? "currentColor" : "none"} />
          </button>
          <button
            onClick={onShare}
            aria-label="Share"
            className="w-14 h-14 rounded-2xl glass hairline flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}