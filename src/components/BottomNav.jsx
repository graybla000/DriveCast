import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Compass, Map, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/plan", label: "Plan", icon: Map },
  { to: "/favorites", label: "Saved", icon: Heart },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-2 pointer-events-none">
      <div className="mx-auto max-w-md pointer-events-auto">
        <div className="glass-surface hairline rounded-[22px] flex items-stretch justify-between px-2 py-1.5 shadow-2xl shadow-black/40">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-2 min-h-[52px] transition-all duration-200",
                    isActive ? "text-accent" : "text-muted-foreground active:scale-95"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200",
                        isActive && "bg-accent/15 glow-accent"
                      )}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.6 : 2.2} />
                    </span>
                    <span className="text-[10px] font-semibold tracking-tight">{tab.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}