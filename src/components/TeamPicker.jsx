import React, { useMemo, useRef, useState, useEffect } from "react";
import { Star, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Picks a favourite team from a fixed list.
//
// Typeahead rather than a plain <select>: a league has ~30 teams, which is a long
// scroll on a phone, and people know the name they're looking for. Filtering is
// local — the list is static data, so there's nothing to fetch.
export default function TeamPicker({ teams, value, onChange, placeholder = "Pick a team" }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef(null);

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return teams;
    // Matches anywhere, so "sounders" finds "Seattle Sounders" and "seattle"
    // finds all the Seattle clubs.
    return teams.filter((t) => t.toLowerCase().includes(q));
  }, [teams, filter]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (team) => {
    onChange(team);
    setOpen(false);
    setFilter("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex-1 min-w-0 h-10 px-3 rounded-xl hairline flex items-center justify-between gap-2 text-[13px] font-semibold active:scale-[0.98] transition-transform",
            value ? "bg-accent/15 text-accent" : "glass text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            {value ? <Star size={13} className="fill-current shrink-0" /> : null}
            <span className="truncate">{value ?? placeholder}</span>
          </span>
          <ChevronDown size={14} className="shrink-0 opacity-70" />
        </button>

        {value && (
          <button
            onClick={() => onChange(null)}
            aria-label="Clear favourite team"
            className="w-10 h-10 shrink-0 rounded-xl glass hairline flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-40 left-0 right-0 mt-1.5 rounded-xl glass-surface hairline shadow-2xl shadow-black/40 overflow-hidden">
          <div className="flex items-center gap-2 px-3 h-10 border-b hairline">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search teams…"
              className="flex-1 min-w-0 bg-transparent text-[13px] font-medium focus:outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto no-scrollbar">
            {matches.map((team) => (
              <li key={team}>
                <button
                  onClick={() => choose(team)}
                  className={cn(
                    "w-full px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors",
                    team === value ? "bg-accent/15 text-accent font-bold" : "hover:bg-accent/10"
                  )}
                >
                  {team}
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-3.5 py-3 text-[12.5px] text-muted-foreground font-medium">No teams match.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
