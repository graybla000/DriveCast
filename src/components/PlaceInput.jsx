import React, { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Text input with Google-style place suggestions.
//
// Autocomplete is billed per request, so requests are throttled on purpose:
// a 300ms debounce, a 3-character minimum, and no request at all when the value
// was just chosen from the list (which would otherwise fire a lookup for the
// exact text we already resolved).
const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

export default function PlaceInput({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  inputClassName,
  // Set when `value` is a synthetic label rather than something a user typed —
  // e.g. "Current location", which stands in for coordinates. Autocompleting it
  // would send a meaningless (and billed) query and return nonsense matches.
  disableSuggestions = false,
  // { lat, lng } to rank nearby places first. Without it Google ranks globally,
  // so "Fred Meyer" can return a store in another state ahead of the local one.
  bias = null,
  children,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  // Set when the user picks a suggestion, so the resulting value change doesn't
  // immediately trigger another lookup for that same text.
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    const query = (value ?? "").trim();
    if (disableSuggestions || query.length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (Number.isFinite(bias?.lat) && Number.isFinite(bias?.lng)) {
          params.set("lat", String(bias.lat));
          params.set("lng", String(bias.lng));
        }
        const res = await fetch(`/api/places?${params}`);
        const payload = await res.json();
        if (cancelled) return;
        // A failure here is non-fatal — typing an address by hand still works,
        // so suggestions just stay empty rather than showing an error.
        const next = res.ok && !payload.error ? (payload.suggestions ?? []) : [];
        setSuggestions(next);
        setOpen(next.length > 0);
        setActiveIndex(-1);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, disableSuggestions, bias?.lat, bias?.lng]);

  // Dismiss on outside click, the behaviour people expect from a dropdown.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const choose = (suggestion) => {
    justSelectedRef.current = true;
    setOpen(false);
    setSuggestions([]);
    onChange(suggestion.description);
    // The placeId is the precise handle — routing with it avoids re-resolving
    // an address string that may be ambiguous.
    onSelect?.(suggestion);
  };

  const onKeyDown = (e) => {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => suggestions.length && setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            className={cn(
              "w-full h-11 pl-3.5 pr-9 rounded-xl bg-muted/50 hairline text-[14px] font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/50",
              inputClassName
            )}
          />
          {isLoading && (
            <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {children}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-40 left-0 right-0 mt-1.5 rounded-xl glass-surface hairline shadow-2xl shadow-black/40 overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={s.placeId ?? s.description}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(s)}
                className={cn(
                  "w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors",
                  i === activeIndex ? "bg-accent/15" : "hover:bg-accent/10"
                )}
              >
                <MapPin size={14} className="text-accent mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold truncate">{s.main}</span>
                  {s.secondary && (
                    <span className="block text-[11.5px] font-medium text-muted-foreground truncate">
                      {s.secondary}
                    </span>
                  )}
                </span>
                {/* Straight-line distance, present only when biased by location. */}
                {s.distanceMiles != null && (
                  <span className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0 mt-0.5">
                    {s.distanceMiles} mi
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
