import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X, RotateCw, Sparkles, ChevronLeft, ChevronRight, KeyRound, AlertCircle } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { applyFilters, CATEGORIES, FEATURED_CATEGORY_IDS, queryForCategory, surpriseFrom } from "@/lib/contentData";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import RecommendationCard from "@/components/RecommendationCard";
import FiltersSheet from "@/components/FiltersSheet";
import SurpriseResultSheet from "@/components/SurpriseResultSheet";
import { cn } from "@/lib/utils";

const EMPTY_FILTERS = { category: [], duration: [] };

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
    if (cat) {
      setFilters((f) => ({ ...f, category: [cat] }));
      setIndex(0);
    }
  }, [params]);

  // One category at a time drives the search — a deck can only show one query's
  // results, and each extra query would cost another 100 quota units.
  const activeCategory = filters.category?.[0] ?? FEATURED_CATEGORY_IDS[0];
  const { videos, isLoading, error, isMissingKey, isQuotaError } = useYouTubeSearch(
    queryForCategory(activeCategory),
    { category: activeCategory, maxResults: 15 }
  );

  // Duration filtering happens client-side on whatever the API returned.
  const deck = useMemo(() => applyFilters(videos, filters), [videos, filters]);
  const current = deck[index];
  const next = deck[index + 1];

  const activeFilterCount = (filters.category?.length || 0) + (filters.duration?.length || 0);

  const advance = () => setIndex((i) => i + 1);

  const handleSwipe = (dir) => {
    if (dir === "like" && current) toggleFavorite(current);
    advance();
  };

  // Dragging the card is the only way to move through the deck on touch, which
  // leaves desktop with no way to advance at all. These give pointer and
  // keyboard users the same navigation. `deck.length` is a valid index — it's
  // the "all caught up" state, reachable by swiping, so clicking must reach it
  // too rather than stopping one short.
  const canGoPrev = index > 0;
  const canGoNext = index < deck.length;

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(deck.length, i + 1));

  useEffect(() => {
    const onKeyDown = (event) => {
      // Don't hijack arrows while a sheet is open or a field has focus.
      if (filtersOpen || surpriseOpen) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
     
  }, [filtersOpen, surpriseOpen, deck.length]);

  const reshuffle = () => {
    setFilters(EMPTY_FILTERS);
    setIndex(0);
    setParams({});
  };

  const openSurprise = () => {
    setSurpriseItem(surpriseFrom(videos));
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
          {filters.duration?.map((id) => (
            <FilterChip key={id} label={id} onRemove={() => setFilters((f) => ({ ...f, duration: f.duration.filter((x) => x !== id) }))} />
          ))}
        </div>
      )}

      <div className="relative" style={{ height: 560 }}>
        {isLoading ? (
          <div className="absolute inset-0 rounded-[28px] glass hairline animate-pulse" />
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center glass hairline rounded-[28px] p-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/15 mb-4">
              {isMissingKey ? (
                <KeyRound size={30} className="text-accent" />
              ) : (
                <AlertCircle size={30} className={isQuotaError ? "text-gold" : "text-destructive"} />
              )}
            </div>
            <h3 className="text-display text-[22px] font-extrabold tracking-tight">
              {isMissingKey ? "Search isn't configured" : isQuotaError ? "Daily quota reached" : "Couldn't load results"}
            </h3>
            <p className="text-muted-foreground text-[14px] font-medium mt-1.5 max-w-xs leading-relaxed">
              {error.message}
            </p>
          </div>
        ) : current ? (
          <>
            {next && <RecommendationCard key={next.id + "-bg"} item={next} active={false} onSwipe={() => {}} onSave={() => {}} onShare={() => {}} onStart={() => {}} />}
            <RecommendationCard
              key={current.id}
              item={current}
              active={true}
              onSwipe={handleSwipe}
              onSave={() => toggleFavorite(current)}
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

        {/* Overlaid on the card rather than below it. Vertically centred on the
            artwork (h-56), which keeps them clear of the card's own action row.
            z-20 puts them above both stacked cards. */}
        {deck.length > 0 && (
          <>
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label="Previous suggestion"
              className={cn(
                "absolute left-3 top-28 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 rounded-full",
                "bg-black/40 backdrop-blur-md text-white ring-1 ring-white/20 shadow-lg shadow-black/40",
                "transition-all active:scale-90",
                canGoPrev ? "hover:bg-black/60" : "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronLeft size={22} />
            </button>

            <button
              onClick={goNext}
              disabled={!canGoNext}
              aria-label="Next suggestion"
              className={cn(
                "absolute right-3 top-28 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 rounded-full",
                "bg-black/40 backdrop-blur-md text-white ring-1 ring-white/20 shadow-lg shadow-black/40",
                "transition-all active:scale-90",
                canGoNext ? "hover:bg-black/60" : "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronRight size={22} />
            </button>

            <span className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md ring-1 ring-white/20 text-white text-[11px] font-bold tabular-nums">
              {Math.min(index + 1, deck.length)} / {deck.length}
            </span>
          </>
        )}
      </div>

      {deck.length > 0 && (
        <p className="text-center text-[12px] font-semibold text-muted-foreground">
          Swipe or use <span className="text-accent">←</span> <span className="text-accent">→</span> · swipe right
          to save
        </p>
      )}

      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onApply={(f) => { setFilters(f); setIndex(0); }} />

      <SurpriseResultSheet open={surpriseOpen} item={surpriseItem} onClose={() => setSurpriseOpen(false)} onReroll={() => setSurpriseItem(surpriseFrom(videos))} onShare={() => {}} />
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