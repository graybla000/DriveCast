import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Clock, ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { CATEGORIES, TRENDING, searchItems, itemsByCategory } from "@/lib/contentData";
import SearchBar from "@/components/SearchBar";
import FilterPills from "@/components/FilterPills";
import SurpriseMeCard from "@/components/SurpriseMeCard";
import CategoryCard from "@/components/CategoryCard";
import HorizontalScroller from "@/components/HorizontalScroller";
import ItemRow from "@/components/ItemRow";
import SurpriseResultSheet from "@/components/SurpriseResultSheet";
import { surpriseMe } from "@/lib/contentData";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const navigate = useNavigate();
  const { recentSearches, addRecentSearch, startPlaying } = useAppStore();
  const [query, setQuery] = useState("");
  const [activePill, setActivePill] = useState(null);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [surpriseItem, setSurpriseItem] = useState(null);

  const results = query ? searchItems(query) : [];

  const openSurprise = () => {
    setSurpriseItem(surpriseMe(true));
    setSurpriseOpen(true);
  };
  const reroll = () => setSurpriseItem(surpriseMe(true));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) addRecentSearch(query);
  };

  const trendingItems = TRENDING.map((name) => itemsByCategory(CATEGORIES.find((c) => c.name === name)?.id)[0]).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-[14px] font-medium">{greeting()} 👋</p>
        <h1 className="text-display text-[32px] font-extrabold tracking-tight leading-tight">Discover</h1>
      </div>

      <form onSubmit={handleSearchSubmit}>
        <SearchBar value={query} onChange={setQuery} />
      </form>

      {query ? (
        <section>
          <p className="text-[13px] font-semibold text-muted-foreground mb-3">
            {results.length} result{results.length !== 1 ? "s" : ""} for “{query}”
          </p>
          <div className="space-y-2.5">
            {results.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            {results.length === 0 && (
              <p className="text-muted-foreground text-[14px] text-center py-10">No matches — try another search.</p>
            )}
          </div>
        </section>
      ) : (
        <>
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
                <CategoryCard
                  key={c.id}
                  category={c}
                  onClick={() => navigate(`/explore?category=${c.id}`)}
                />
              ))}
            </HorizontalScroller>
          </Section>

          <Section title="Trending now" icon={<TrendingUp size={16} className="text-gold" />}>
            <HorizontalScroller>
              {trendingItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => startPlaying(item)}
                  className="shrink-0 w-40 active:scale-[0.97] transition-transform text-left"
                >
                  <div className={`relative h-24 rounded-2xl overflow-hidden bg-gradient-to-br ${item.gradient}`}>
                    <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5), transparent 60%)" }} />
                    <div className="absolute bottom-2 left-2.5 text-white text-[11px] font-bold uppercase tracking-wider">{item.type}</div>
                  </div>
                  <p className="text-[13px] font-semibold leading-tight mt-2 line-clamp-2">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{item.duration} min · ★ {item.rating.toFixed(1)}</p>
                </button>
              ))}
            </HorizontalScroller>
          </Section>

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