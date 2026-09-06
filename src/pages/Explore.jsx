import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, Heart, X, RotateCw, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { ITEMS, applyFilters, CATEGORIES, surpriseMe } from "@/lib/contentData";
import RecommendationCard from "@/components/RecommendationCard";
import FiltersSheet from "@/components/FiltersSheet";
import SurpriseResultSheet from "@/components/SurpriseResultSheet";
import { cn } from "@/lib/utils";

const EMPTY_FILTERS = { category: [], duration: [], distance: [], toggles: {} };

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const { toggleFavorite, startPlaying } = useAppStore();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [surpriseItem, setSurpriseItem] = useState(null);

  // Honor a ?category= deep link from Home category cards.
  useEffect(() => {
    const cat = params.get("category");
    if (cat) setFilters((f) => ({ ...f, category: [cat] }));
  }, [params]);

  const deck = useMemo(() => applyFilters(ITEMS, filters), [filters]);
  const current = deck[index];
  const next = deck[index + 1];

  const activeFilterCount =
    (filters.category?.length || 0) +
    (filters.duration?.length || 0) +
    (filters.distance?.length || 0) +
    Object.values(filters.toggles || {}).filter(Boolean).length;

  const advance = () => setIndex((i) => i + 1);

  const handleSwipe = (dir) => {
    if (dir === "like" && current) toggleFavorite(current.id);
    advance();
  };

  const reshuffle = () => {
    setFilters(EMPTY_FILTERS);
    setIndex(0);
    setParams({});
  };

  const openSurprise = () => {
    setSurpriseItem(surpriseMe(true));
    setSurpriseOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-[32px] font-extrabold tracking-tight leading-tight">Explore</h1>
          <p className="text-muted-foreground text-[13px] font-medium">Swipe to discover your next listen</p>
        </div>
        <button
          onClick={() => setFiltersOpen(true)}
          className="relative flex items-center gap-2 h-11 px-4 rounded-2xl glass hairline text-[13px] font-semibold active:scale-95 transition-transform"
        >
          <SlidersHorizontal size={16} /> Filters
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent text-accent-foreground text-[11px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.category.map((id) => (
            <FilterChip key={id} label={CATEGORIES.find((c) => c.id === id)?.name} onRemove={() => setFilters((f) => ({ ...f, category: f.category.filter((x) => x !== id) }))} />
          ))}
          {Object.entries(filters.toggles || {}).filter(([, v]) => v).map(([k]) => (
            <FilterChip key={k} label={k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} onRemove={() => setFilters((f) => ({ ...f, toggles: { ...f.toggles, [k]: false } }))} />
          ))}
        </div>
      )}

      <div className="relative" style={{ height: 560 }}>
        {current ? (
          <>
            {next && <RecommendationCard key={next.id + "-bg"} item={next} active={false} onSwipe={() => {}} onSave={() => {}} onShare={() => {}} onStart={() => {}} />}
            <RecommendationCard
              key={current.id}
              item={current}
              active={true}
              onSwipe={handleSwipe}
              onSave={() => toggleFavorite(current.id)}
              onShare={() => {}}
              onStart={() => startPlaying(current)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center glass hairline rounded-[28px] p-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/15 text-accent mb-4">
              <Sparkles size={30} />
            </div>
            <h3 className="text-display text-[22px] font-extrabold tracking-tight">You're all caught up</h3>
            <p className="text-muted-foreground text-[14px] font-medium mt-1.5 max-w-xs">
              You've seen every suggestion with these filters. Reshuffle or try the Wild Card.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button onClick={reshuffle} className="h-12 px-5 rounded-2xl bg-gradient-to-r from-accent to-cyan-500 text-accent-foreground font-bold text-[14px] flex items-center gap-2 active:scale-95 transition-transform">
                <RotateCw size={16} /> Reshuffle
              </button>
              <button onClick={openSurprise} className="h-12 px-5 rounded-2xl glass hairline font-bold text-[14px] flex items-center gap-2 active:scale-95 transition-transform">
                <Sparkles size={16} className="text-gold" /> Surprise Me
              </button>
            </div>
          </div>
        )}
      </div>

      {current && (
        <p className="text-center text-[12px] font-semibold text-muted-foreground">
          Swipe <span className="text-accent">right to save</span> · left to skip · {index + 1} of {deck.length}
        </p>
      )}

      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onApply={(f) => { setFilters(f); setIndex(0); }} />

      <SurpriseResultSheet open={surpriseOpen} item={surpriseItem} onClose={() => setSurpriseOpen(false)} onReroll={() => setSurpriseItem(surpriseMe(true))} onShare={() => {}} />
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <button onClick={onRemove} className="flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-accent/15 text-accent text-[12px] font-semibold active:scale-95 transition-transform">
      {label}
      <X size={13} />
    </button>
  );
}