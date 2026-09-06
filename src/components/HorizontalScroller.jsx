import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Horizontal row with overlaid arrow buttons.
//
// The rows it replaces used `overflow-x-auto no-scrollbar`, which works on touch
// but leaves desktop with no way to reach the overflow at all: the scrollbar is
// hidden by design, and a mouse wheel scrolls the page vertically instead. The
// arrows are the pointer/keyboard affordance, and they only appear on the side
// there is actually more content, so a row that fits shows none.
export default function HorizontalScroller({ children, className, gapClass = "gap-3" }) {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 4px slack: fractional scroll positions never land exactly on the bounds.
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    sync();
    el.addEventListener("scroll", sync, { passive: true });

    // Catches both viewport resizes and the row's contents changing width
    // (e.g. filtered results), which plain resize events would miss.
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);

    return () => {
      el.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [sync, children]);

  const nudge = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrowClass =
    "absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-9 h-9 rounded-full " +
    "bg-black/50 backdrop-blur-md text-white ring-1 ring-white/20 shadow-lg shadow-black/40 " +
    "transition-opacity active:scale-90 hover:bg-black/70";

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={cn("flex overflow-x-auto no-scrollbar -mx-5 px-5", gapClass, className)}
      >
        {children}
      </div>

      {canLeft && (
        <button onClick={() => nudge(-1)} aria-label="Scroll left" className={cn(arrowClass, "left-0")}>
          <ChevronLeft size={20} />
        </button>
      )}
      {canRight && (
        <button onClick={() => nudge(1)} aria-label="Scroll right" className={cn(arrowClass, "right-0")}>
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
