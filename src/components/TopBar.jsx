import React from "react";
import { Link } from "react-router-dom";
import { Sun, Moon, Radio } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";

export default function TopBar() {
  const { theme, toggleTheme } = useAppStore();
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-40 safe-top">
      <div className="glass-surface">
        <div className="mx-auto max-w-md px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 active:scale-95 transition-transform">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent/15 text-accent">
              <Radio size={18} strokeWidth={2.6} />
            </span>
            <span className="text-display text-[19px] font-extrabold tracking-tight">
              Drive<span className="text-accent">Cast</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex items-center justify-center w-10 h-10 rounded-full glass hairline text-muted-foreground active:scale-90 transition-transform"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              to="/profile"
              aria-label="Profile"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-accent to-indigo-500 text-white text-[13px] font-bold active:scale-90 transition-transform"
            >
              DC
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}