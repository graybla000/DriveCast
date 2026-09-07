import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Star, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Picks a favorite team from a fixed list.
//
// The list is rendered in a PORTAL on document.body, positioned with fixed
// coordinates taken from the trigger. That is deliberate and worth keeping:
// rendered inline, the panel was defeated twice over. Profile's section wraps its
// children in overflow-hidden to clip them to its rounded corners, which cut the
// panel off — pickers further down the list showed fewer and fewer rows. And
// `glass` applies backdrop-filter, which creates a stacking context, trapping the
// panel's z-index inside its section so later sections and the fixed bottom nav
// painted over it. A portal sidesteps both: no ancestor can clip it, and its
// z-index competes at the document level.
//
// Typeahead rather than a plain <select>: a league has ~30 teams, which is a long
// scroll on a phone, and people know the name they want. Filtering is local — the
// list is static data, so there's nothing to fetch.

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 4;
const SEARCH_ROW = 40;
const PANEL_HEIGHT = SEARCH_ROW + ROW_HEIGHT * VISIBLE_ROWS;
const GAP = 6;
// The floating bottom nav occupies this much of the viewport bottom.
const BOTTOM_RESERVE = 96;

export default function TeamPicker({ teams, value, onChange, placeholder = "Pick a team" }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [position, setPosition] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return teams;
    // Matches anywhere, so "sounders" finds "Seattle Sounders" and "seattle"
    // finds every Seattle club.
    return teams.filter((t) => t.toLowerCase().includes(q));
  }, [teams, filter]);

  /** Place the panel below the trigger, or above it when there isn't room. */
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - BOTTOM_RESERVE;
    const dropUp = spaceBelow < PANEL_HEIGHT && rect.top > spaceBelow;

    setPosition({
      left: rect.left,
      width: rect.width,
      top: dropUp ? Math.max(GAP, rect.top - PANEL_HEIGHT - GAP) : rect.bottom + GAP,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();

    // Fixed coordinates go stale the moment anything moves, so track both.
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);

    const onDocClick = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (!matches.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % matches.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
      }
    };

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, place, matches.length]);

  const choose = (team) => {
    onChange(team);
    setOpen(false);
    setFilter("");
    setActiveIndex(-1);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          ref={triggerRef}
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
            aria-label="Clear favorite team"
            className="w-10 h-10 shrink-0 rounded-xl glass hairline flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ left: position.left, top: position.top, width: position.width }}
            // z-[70] clears the bottom nav (z-50) and the expanded video (z-60).
            className="fixed z-[70] rounded-xl glass-surface hairline shadow-2xl shadow-black/50 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 border-b hairline" style={{ height: SEARCH_ROW }}>
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setActiveIndex(-1);
                }}
                placeholder="Search teams…"
                className="flex-1 min-w-0 bg-transparent text-[13px] font-medium focus:outline-none placeholder:text-muted-foreground/70"
              />
            </div>

            {/* Exactly four rows, identical for every sport: fixed row heights with
                no wrapping, since long names like "Portland Trail Blazers" used to
                wrap and make each league's list a different height. */}
            <ul className="overflow-y-auto no-scrollbar" style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}>
              {matches.map((team, i) => (
                <li key={team}>
                  <button
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => choose(team)}
                    style={{ height: ROW_HEIGHT }}
                    className={cn(
                      "w-full px-3.5 flex items-center text-left text-[13px] font-medium transition-colors",
                      team === value
                        ? "bg-accent/15 text-accent font-bold"
                        : i === activeIndex
                          ? "bg-accent/10"
                          : ""
                    )}
                  >
                    <span className="truncate">{team}</span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && (
                <li
                  style={{ height: ROW_HEIGHT }}
                  className="px-3.5 flex items-center text-[12.5px] text-muted-foreground font-medium"
                >
                  No teams match.
                </li>
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
