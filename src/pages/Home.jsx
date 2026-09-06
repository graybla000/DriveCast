import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight, AlertCircle, KeyRound } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { CATEGORIES, FEATURED_CATEGORY_IDS, getCategory, queryForCategory, surpriseFrom } from "@/lib/contentData";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import SearchBar from "@/components/SearchBar";
import FilterPills from "@/components/FilterPills";
import SurpriseMeCard from "@/components/SurpriseMeCard";
import CategoryCard from "@/components/CategoryCard";
import DrivePanel from "@/components/DrivePanel";
import HorizontalScroller from "@/components/HorizontalScroller";
import ItemRow from "@/components/ItemRow";
import VideoRow from "@/components/VideoRow";
import SurpriseResultSheet from "@/components/SurpriseResultSheet";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Typing shouldn't fire a request per keystroke — each search costs 100 quota
// units, so the query is only committed once typing pauses.
const SEARCH_DEBOUNCE_MS = 600;

export default function Home() {
  const navigate = useNavigate();
  const { recentSearches, addRecentSearch, startPlaying } = useAppStore();
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
      <div>
        <p className="text-muted-foreground text-[14px] font-medium">{greeting()} 👋</p>
        <h1 className="text-display text-[32px] font-extrabold tracking-tight leading-tight">Discover</h1>
      </div>

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
              if (id) navigate(`/explore?category=${id}`);
              else setActivePill(null);
            }}
          />

          <SurpriseMeCard onClick={openSurprise} />

          <Section title="Browse categories" actionLabel="All" onAction={() => navigate("/explore")}>
            <HorizontalScroller>
              {CATEGORIES.map((c) => (
                <CategoryCard key={c.id} category={c} onClick={() => navigate(`/explore?category=${c.id}`)} />
              ))}
            </HorizontalScroller>
          </Section>

          {FEATURED_CATEGORY_IDS.map((id) => {
            const category = getCategory(id);
            if (!category) return null;
            return (
              <Section
                key={id}
                title={category.name}
                actionLabel="See all"
                onAction={() => navigate(`/explore?category=${id}`)}
              >
                <VideoRow query={category.query} category={id} />
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
