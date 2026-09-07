import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Sun, Moon, Bell, Mic, Download, Car, Sparkles, Crown, LogOut,
  Baby, Heart, Map, Clock, Trophy, ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CATEGORIES, SECTORS } from "@/lib/contentData";
import { MAX_SECTOR_FETCHES } from "@/hooks/useSector";
import FavoriteTeams from "@/components/FavoriteTeams";
import { cn } from "@/lib/utils";

const FUTURE_FEATURES = [
  { icon: Mic, label: "Voice search", desc: "Search by speaking, hands-free" },
  { icon: Sparkles, label: "AI recommendations", desc: "Personalized picks for your route" },
  { icon: Download, label: "Offline downloads", desc: "Listen without a signal" },
  { icon: Car, label: "CarPlay", desc: "DriveCast on your car's display" },
  { icon: Bell, label: "Push notifications", desc: "New episodes & nearby gems" },
  { icon: Crown, label: "Premium subscriptions", desc: "Exclusive content & ad-free" },
];

export default function Profile() {
  const navigate = useNavigate();
  // Preferred categories come from the shared store now, so Home and the trip
  // planner can honour them instead of asking again.
  const {
    theme, toggleTheme, favorites, trips,
    preferredCategories, togglePreferred,
    sectors, toggleSector, clearSectors,
  } = useAppStore();
  const [kidFriendly, setKidFriendly] = useLocalStorage("drivecast:kidFriendly", false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center pt-2">
        <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-accent to-indigo-500 text-white text-[26px] font-extrabold shadow-lg shadow-accent/30">
          DC
        </div>
        <h1 className="text-display text-[24px] font-extrabold tracking-tight mt-3">Driver</h1>
        <p className="text-muted-foreground text-[13px] font-medium">driver@drivecast.app</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Heart size={16} className="text-rose-400" />} value={favorites.length} label="Saved" />
        <Stat icon={<Map size={16} className="text-accent" />} value={trips.length} label="Trips" />
        <Stat icon={<Clock size={16} className="text-gold" />} value={"12h"} label="Listened" />
      </div>

      <Section title="Appearance">
        <Row icon={theme === "dark" ? <Moon size={18} /> : <Sun size={18} />} label="Dark mode" desc="Easier on the eyes while driving">
          <Toggle on={theme === "dark"} onClick={toggleTheme} />
        </Row>
      </Section>

      <Section title="Preferences">
        <Row icon={<Baby size={18} />} label="Kid-friendly by default" desc="Filter out mature content">
          <Toggle on={kidFriendly} onClick={() => setKidFriendly(!kidFriendly)} />
        </Row>
        <div className="px-4 py-3">
          <p className="text-[13px] font-semibold">Preferred categories</p>
          <p className="text-[11.5px] text-muted-foreground font-medium mb-2.5">
            Used for your Home rows and pre-selected when planning a trip
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => togglePreferred(c.id)}
                className={cn(
                  "h-9 px-3.5 rounded-full text-[12px] font-semibold transition-all active:scale-95",
                  preferredCategories.includes(c.id)
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted/50 text-muted-foreground"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Industry">
        <div className="px-4 py-3">
          <p className="text-[13px] font-semibold">Industry focus</p>
          <p className="text-[11.5px] text-muted-foreground font-medium mb-2.5">
            Narrows Manufacturing, CNC, Engineering, Business and AI to your industries
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSector(s.id)}
                className={cn(
                  "h-9 px-3.5 rounded-full text-[12px] font-semibold transition-all active:scale-95",
                  sectors.includes(s.id) ? "bg-accent text-accent-foreground" : "bg-muted/50 text-muted-foreground"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          {sectors.length > MAX_SECTOR_FETCHES && (
            // Each sector is a separate search per row, so the rest are ignored
            // rather than quietly multiplying the daily quota spend.
            <p className="text-[11px] font-medium text-gold mt-2">
              Using the first {MAX_SECTOR_FETCHES} — each industry is a separate search.
            </p>
          )}
          {sectors.length > 0 && (
            <button
              onClick={clearSectors}
              className="mt-2.5 text-[11.5px] font-bold text-muted-foreground active:scale-95 transition-transform"
            >
              Clear industry focus
            </button>
          )}
        </div>
      </Section>

      <Section title="Sports" allowOverflow>
        <Row
          icon={<Trophy size={18} />}
          label="Favorite teams"
          desc="Sets what the sports rows follow"
        >
          <button
            onClick={() => navigate("/sports")}
            className="flex items-center gap-1 text-[12px] font-bold text-accent active:scale-95 transition-transform shrink-0"
          >
            Open <ChevronRight size={13} />
          </button>
        </Row>
        {/* Same component the Sports screen uses, so both stay in step. */}
        <FavoriteTeams bare />
      </Section>

      <Section title="Coming soon">
        <div className="divide-y divide-border">
          {FUTURE_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex items-center justify-center w-10 h-10 rounded-2xl glass hairline text-accent shrink-0">
                  <Icon size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold">{f.label}</p>
                  <p className="text-[12px] text-muted-foreground font-medium">{f.desc}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-bold uppercase tracking-wide">Soon</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Account">
        <button className="w-full flex items-center gap-3 px-4 py-3.5 text-rose-400 active:scale-[0.98] transition-transform">
          <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-rose-500/15 shrink-0">
            <LogOut size={18} />
          </span>
          <span className="text-[14px] font-semibold">Sign out</span>
        </button>
      </Section>

      <p className="text-center text-[11px] text-muted-foreground font-semibold pb-2">DriveCast · Version 1.0.0</p>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="glass hairline rounded-2xl p-3 flex flex-col items-center">
      <span className="mb-1">{icon}</span>
      <span className="text-mono text-[20px] font-bold leading-none">{value}</span>
      <span className="text-[11px] text-muted-foreground font-semibold mt-1">{label}</span>
    </div>
  );
}

/**
 * `allowOverflow` is needed by any section containing a dropdown, and does two
 * things — both required, and neither sufficient alone.
 *
 * 1. Drops overflow-hidden. It's normally there to clip children to the rounded
 *    corners, but it also clips an absolutely-positioned popover, so pickers lower
 *    down showed fewer rows as the section's bottom edge cut them off.
 * 2. Raises the whole section above the sections that follow it. `glass` applies
 *    backdrop-filter, which creates a stacking context — that traps the dropdown's
 *    own z-index INSIDE this section, so a later sibling section painted over any
 *    part of the dropdown extending past this one. The soccer picker, being last,
 *    disappeared behind "Coming soon" entirely.
 */
function Section({ title, children, allowOverflow = false }) {
  return (
    <section className={cn(allowOverflow && "relative z-30")}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{title}</p>
      <div className={cn("glass hairline rounded-2xl", !allowOverflow && "overflow-hidden")}>{children}</div>
    </section>
  );
}

function Row({ icon, label, desc, children }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-muted/50 text-foreground shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold">{label}</p>
        <p className="text-[12px] text-muted-foreground font-medium">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Toggle"
      className={cn(
        "relative w-12 h-7 rounded-full transition-colors shrink-0",
        on ? "bg-accent" : "bg-muted"
      )}
    >
      <span className={cn("absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}