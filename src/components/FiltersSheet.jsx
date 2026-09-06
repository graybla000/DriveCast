import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { FILTER_OPTIONS } from "@/lib/contentData";
import { cn } from "@/lib/utils";

// Custom animated bottom sheet for filters — works on mobile and desktop.
export default function FiltersSheet({ open, onClose, filters, onApply }) {
  const [draft, setDraft] = React.useState(filters);

  React.useEffect(() => setDraft(filters), [filters, open]);

  const toggleArray = (key, id) => {
    setDraft((prev) => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] };
    });
  };

  const toggleBool = (key) => {
    setDraft((prev) => ({ ...prev, toggles: { ...prev.toggles, [key]: !prev.toggles[key] } }));
  };

  const reset = () => setDraft({ category: [], duration: [], distance: [], toggles: {} });

  const apply = () => {
    onApply(draft);
    onClose();
  };

  const Chip = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={cn(
        "h-10 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95",
        active ? "bg-accent text-accent-foreground" : "glass hairline text-muted-foreground"
      )}
    >
      {children}
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-[28px] glass-surface hairline border-b-0 max-h-[85vh] flex flex-col"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/40" />
            </div>
            <div className="flex items-center justify-between px-5 py-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-accent" />
                <h2 className="text-display text-[20px] font-extrabold tracking-tight">Filters</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={reset} className="flex items-center gap-1.5 h-9 px-3 rounded-full glass hairline text-[12px] font-semibold text-muted-foreground active:scale-95">
                  <RotateCcw size={13} /> Reset
                </button>
                <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full glass hairline flex items-center justify-center text-muted-foreground active:scale-90">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto no-scrollbar px-5 pb-4 space-y-5">
              <Section title="Category">
                <div className="flex flex-wrap gap-2">
                  {FILTER_OPTIONS.category.map((c) => (
                    <Chip key={c.id} active={draft.category?.includes(c.id)} onClick={() => toggleArray("category", c.id)}>{c.label}</Chip>
                  ))}
                </div>
              </Section>
              <Section title="Duration">
                <div className="flex flex-wrap gap-2">
                  {FILTER_OPTIONS.duration.map((c) => (
                    <Chip key={c.id} active={draft.duration?.includes(c.id)} onClick={() => toggleArray("duration", c.id)}>{c.label}</Chip>
                  ))}
                </div>
              </Section>
              {/* Distance and the kid-friendly/free/indoor toggles are gone:
                  YouTube returns none of that, so filtering on it was fiction. */}
            </div>

            <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] border-t hairline">
              <button onClick={apply} className="w-full h-14 rounded-2xl bg-gradient-to-r from-accent to-cyan-500 text-accent-foreground font-bold text-[15px] active:scale-[0.98] transition-transform">
                Show results
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">{title}</p>
      {children}
    </div>
  );
}