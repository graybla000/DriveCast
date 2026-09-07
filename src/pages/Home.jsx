import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight, AlertCircle, KeyRound, Headphones, Youtube } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import {
  CATEGORIES, FEATURED_CATEGORY_IDS, getCategory, queryForCategory, queriesForCategory,
  podcastQueryForCategory, surpriseFrom,
} from "@/lib/contentData";
import { cn } from "@/lib/utils";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import SearchBar from "@/components/SearchBar";
import FilterPills from "@/components/FilterPills";
import SurpriseMeCard from "@/components/SurpriseMeCard";
import CategoryCard from "@/components/CategoryCard";
import DrivePanel from "@/components/DrivePanel";
import HorizontalScroller from "@/components/HorizontalScroller";
import ItemRow from "@/components/ItemRow";
import VideoRow from "@/components/VideoRow";
import EpisodeRow from "@/components/EpisodeRow";
import SurpriseResultSheet from "@/components/SurpriseResultSheet";

// Typing shouldn't fire a request per keystroke — each search costs 100 quota
// units, so the query is only committed once typing pauses.
const SEARCH_DEBOUNCE_MS = 600;

export default function Home() {
  const navigate = useNavigate();
  const {
    recentSearches, addRecentSearch, startPlaying, isDriveActive,
    preferredCategories, activeSectors,
  } = useAppStore();

  // Rows follow the preferences set in Profile, falling back to the featured set
  // when none are chosen. Capped because every row is a live search.
  const rowCategoryIds = preferredCategories.length
    ? preferredCategories.slice(0, FEATURED_CATEGORY_IDS.length)
    : FEATURED_CATEGORY_IDS;
  // Audio while a drive is on, because that's the only source that keeps playing
  // once the browser is backgrounded for navigation. Video otherwise.
  const [source, setSource] = useState(isDriveActive ? "audio" : "video");
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [activePill, setActivePill] = useState(null);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [surpriseItem, setSurpriseItem] = useState(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setCommittedQuery("");
      return;
    }
    const timer = setTimeout(() => setCommittedQuery(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useYouTubeSearch(committedQuery);

  // The Wild Card pulls from the first featured row, so it needs no extra quota.
  const wildcardPool = useYouTubeSearch(queryForCategory(FEATURED_CATEGORY_IDS[0]), {
    category: FEATURED_CATEGORY_IDS[0],
    maxResults: 10,
  });

  const openSurprise = () => {
    setSurpriseItem(surpriseFrom(wildcardPool.videos));
    setSurpriseOpen(true);
  };
  const reroll = () => setSurpriseItem(surpriseFrom(wildcardPool.videos));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setCommittedQuery(trimmed);
    addRecentSearch(trimmed);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearchSubmit}>
        <SearchBar value={query} onChange={setQuery} />
      </form>

      {query.trim() ? (
        <SearchResults query={query} committedQuery={committedQuery} search={search} />
      ) : (
        <>
          <DrivePanel variant="status" />

          <FilterPills
            options={CATEGORIES.map((c) => ({ id: c.id, label: c.name }))}
            active={activePill}
            onSelect={(id) => {
              // Sports has its own screen — subcategories and team pickers don't
              // fit the Explore swipe deck.
              if (id === "sports") navigate("/sports");
              else if (id) navigate(`/explore?category=${id}`);
              else setActivePill(null);
            }}
          />

          <SurpriseMeCard onClick={openSurprise} />

          <Section title="Browse categories" actionLabel="All" onAction={() => navigate("/explore")}>
            <HorizontalScroller>
              {CATEGORIES.map((c) => (
                <CategoryCard
                  key={c.id}
                  category={c}
                  onClick={() => navigate(c.id === "sports" ? "/sports" : `/explore?category=${c.id}`)}
                />
              ))}
            </HorizontalScroller>
          </Section>

          <SourceToggle source={source} onChange={setSource} />

          {rowCategoryIds.map((id) => {
            const category = getCategory(id);
            if (!category) return null;
            return (
              <Section
                key={id}
                title={category.name}
                actionLabel="See all"
                onAction={() => navigate(`/explore?category=${id}`)}
              >
                {source === "audio" ? (
                  <EpisodeRow query={podcastQueryForCategory(id)} category={id} />
                ) : (
                  <VideoRow queries={queriesForCategory(id, activeSectors)} category={id} />
                )}
              </Section>
            );
          })}

          <Section title="Recent searches" icon={<Clock size={16} className="text-muted-foreground" />}>
            <div className="space-y-1.5">
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="w-full flex items-center justify-between px-4 h-12 rounded-2xl glass hairline active:scale-[0.98] transition-transform"
                >
                  <span className="flex items-center gap-3 text-[14px] font-medium">
                    <Clock size={15} className="text-muted-foreground" /> {s}
                  </span>
                  <ArrowRight size={15} className="text-muted-foreground" />
                </button>
              ))}
              {recentSearches.length === 0 && (
                <p className="text-muted-foreground text-[13px] py-2">No recent searches yet.</p>
              )}
            </div>
          </Section>
        </>
      )}

      <SurpriseResultSheet
        open={surpriseOpen}
        item={surpriseItem}
        onClose={() => setSurpriseOpen(false)}
        onReroll={reroll}
        onShare={() => {}}
      />
    </div>
  );
}

function SearchResults({ query, committedQuery, search }) {
  const { videos, isLoading, error, isMissingKey, isQuotaError } = search;
  const pendingDebounce = query.trim() !== committedQuery;

  if (error) {
    const Icon = isMissingKey ? KeyRound : AlertCircle;
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl glass hairline">
        <Icon size={18} className={isQuotaError ? "text-gold mt-0.5 shrink-0" : "text-destructive mt-0.5 shrink-0"} />
        <div>
          <p className="text-[14px] font-semibold">
            {isMissingKey ? "YouTube search isn't configured" : isQuotaError ? "Daily quota reached" : "Search failed"}
          </p>
          <p className="text-[12.5px] text-muted-foreground font-medium leading-relaxed mt-0.5">{error.message}</p>
        </div>
      </div>
    );
  }

  if (pendingDebounce || isLoading) {
    return (
      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[76px] rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <section>
      <p className="text-[13px] font-semibold text-muted-foreground mb-3">
        {videos.length} result{videos.length !== 1 ? "s" : ""} for “{committedQuery}”
      </p>
      <div className="space-y-2.5">
        {videos.map((video) => (
          <ItemRow key={video.id} item={video} />
        ))}
        {videos.length === 0 && (
          <p className="text-muted-foreground text-[14px] text-center py-10">No matches — try another search.</p>
        )}
      </div>
    </section>
  );
}

/**
 * Audio vs video. Not a cosmetic preference: only audio survives the browser
 * being backgrounded, so it's the one that keeps playing while Maps navigates.
 */
function SourceToggle({ source, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-2xl glass hairline">
      {[
        { id: "audio", label: "Podcasts", icon: <Headphones size={14} />, hint: "plays while you drive" },
        { id: "video", label: "Videos", icon: <Youtube size={14} />, hint: "needs the app open" },
      ].map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "flex-1 h-11 rounded-xl flex flex-col items-center justify-center gap-0 transition-all",
            source === option.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-1.5 text-[13px] font-bold">
            {option.icon} {option.label}
          </span>
          <span className="text-[9.5px] font-semibold opacity-75">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}

function Section({ title, icon, actionLabel, onAction, children }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-display text-[20px] font-bold tracking-tight">
          {icon} {title}
        </h2>
        {actionLabel && (
          <button onClick={onAction} className="text-accent text-[13px] font-semibold active:scale-95 transition-transform">
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
