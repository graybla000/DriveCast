import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Play, Heart, Share2, Clock, RotateCw } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { TypeIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

// Wild Card reveal sheet — shows the "Surprise Me" result with a roll animation.
export default function SurpriseResultSheet({ open, item, onClose, onReroll, onShare }) {
  const { isFavorite, toggleFavorite, startPlaying } = useAppStore();
  if (!item) return null;
  const saved = isFavorite(item.id);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            // mx-auto max-w-md matches TopBar, BottomNav and main. Being fixed,
            // this sheet escapes the layout's width constraint, so without it the
            // sheet stretched the full viewport width on anything wider than a
            // phone.
            className="fixed bottom-0 inset-x-0 mx-auto max-w-md z-50 rounded-t-[32px] glass-surface hairline border-b-0 max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex justify-center pt-3 pb-1 sticky top-0 glass-surface z-10">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/40" />
            </div>

            <div className="px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
              <motion.div
                key={item.id}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 18, stiffness: 200, delay: 0.1 }}
              >
                <div className="flex items-center gap-1.5 text-gold text-[11px] font-bold uppercase tracking-wider mb-2">
                  <Sparkles size={13} /> Your Wild Card
                </div>

                <div className={cn("relative h-48 rounded-3xl overflow-hidden bg-gradient-to-br mb-4", item.gradient)}>
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.5), transparent 60%)" }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center justify-center w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md text-white">
                    <TypeIcon type={item.type} size={22} />
                  </div>
                </div>

                <h2 className="text-display text-[26px] font-extrabold tracking-tight leading-tight">{item.title}</h2>
                <div className="flex items-center gap-3 mt-2 text-[13px] font-semibold text-muted-foreground">
                  {item.duration > 0 && (
                    <span className="flex items-center gap-1"><Clock size={14} /> {item.duration} min</span>
                  )}
                  {item.host && <span className="truncate">{item.host}</span>}
                </div>
                <p className="text-muted-foreground text-[15px] font-medium leading-relaxed mt-3">{item.description}</p>
                {item.location && <p className="text-accent text-[13px] font-semibold mt-2">{item.location}</p>}

                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => { startPlaying(item); onClose(); }}
                    className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-accent to-cyan-500 text-accent-foreground font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                  >
                    <Play size={20} fill="currentColor" className="ml-0.5" /> Start listening
                  </button>
                  <button
                    onClick={() => toggleFavorite(item)}
                    aria-label={saved ? "Remove from favorites" : "Save"}
                    className={cn("w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-transform hairline", saved ? "bg-rose-500/20 text-rose-400" : "glass text-muted-foreground")}
                  >
                    <Heart size={22} fill={saved ? "currentColor" : "none"} />
                  </button>
                  <button onClick={onShare} aria-label="Share" className="w-14 h-14 rounded-2xl glass hairline flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
                    <Share2 size={20} />
                  </button>
                </div>

                <button
                  onClick={onReroll}
                  className="w-full h-12 mt-3 rounded-2xl glass hairline flex items-center justify-center gap-2 text-[14px] font-semibold text-muted-foreground active:scale-[0.98] transition-transform"
                >
                  <RotateCw size={16} /> Roll again
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}