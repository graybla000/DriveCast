import React from "react";
import HorizontalScroller from "@/components/HorizontalScroller";
import { cn } from "@/lib/utils";

// Horizontal scrollable quick-filter pill chips.
export default function FilterPills({ options, active, onSelect }) {
  return (
    <HorizontalScroller gapClass="gap-2" className="py-0.5">
      {options.map((opt) => {
        const isActive = active === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(isActive ? null : opt.id)}
            className={cn(
              "shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95",
              isActive
                ? "bg-accent text-accent-foreground glow-accent"
                : "glass hairline text-muted-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </HorizontalScroller>
  );
}