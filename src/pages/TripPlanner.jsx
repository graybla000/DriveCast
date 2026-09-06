import React, { useState } from "react";
import { MapPin, Clock, Sparkles, Save, Trash2, Route as RouteIcon, Check } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { CATEGORIES, FEATURED_CATEGORY_IDS, queryForCategory } from "@/lib/contentData";
import { useYouTubeSearches } from "@/hooks/useYouTubeSearch";
import DrivePanel from "@/components/DrivePanel";
import ItemRow from "@/components/ItemRow";
import { cn } from "@/lib/utils";

// Each distinct category costs another search (100 quota units on a cache miss),
// so the number of interests that actually drive a fetch is capped.
const MAX_INTEREST_FETCHES = 3;

export default function TripPlanner() {
  // Destination and trip length both come from the drive — there's no separate
  // destination field or duration picker. Two sources for the same two facts
  // could disagree, and the drive is the one backed by real routing data.
  const { saveTrip, trips, deleteTrip, startPlaying, drive, driveMinutes, isDriveActive } = useAppStore();
  const [interests, setInterests] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const toggleInterest = (id) =>
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Live pool for the chosen interests, falling back to the featured topics.
  const fetchIds = (interests.length ? interests : FEATURED_CATEGORY_IDS).slice(0, MAX_INTEREST_FETCHES);
  const pool = useYouTubeSearches(fetchIds.map((id) => ({ query: queryForCategory(id), category: id })));

  const curate = () => {
    // Fill the actual drive, greedily, with a shuffled mix.
    let remaining = driveMinutes;
    const route = [];
    const shuffled = [...pool.videos].sort(() => Math.random() - 0.5);
    for (const item of shuffled) {
      if (item.duration <= remaining) {
        route.push(item);
        remaining -= item.duration;
      }
      if (remaining <= 0) break;
    }
    setSuggestions(route);
  };

  const saveCurrent = () => {
    if (!suggestions?.length) return;
    saveTrip({
      destination: drive.destination,
      origin: drive.originLabel || drive.origin,
      driveMinutes,
      interests,
      // Full snapshots, not ids: there is no catalog to resolve ids against.
      stops: suggestions,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const totalMin = suggestions?.reduce((a, b) => a + b.duration, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-[32px] font-extrabold tracking-tight leading-tight">Trip Planner</h1>
        <p className="text-muted-foreground text-[13px] font-medium">Curate listens and stops along your route</p>
      </div>

      {/* Starting a drive belongs here rather than on Home — this is the screen
          where entering trip details is the point. */}
      <DrivePanel variant="setup" />

      <div className="space-y-4 glass hairline rounded-3xl p-5">
        {/* Both facts are read-only here, restated so it's obvious what the
            curation is filling. Change them by changing the drive above. */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-muted/40 hairline px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <MapPin size={11} /> Destination
            </p>
            <p className="text-[14px] font-semibold truncate mt-1">
              {isDriveActive ? drive.destination : <span className="text-muted-foreground">Set a drive</span>}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/40 hairline px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Clock size={11} /> Drive time
            </p>
            <p className="text-[14px] font-semibold mt-1">
              {isDriveActive ? (
                `${Math.floor(driveMinutes / 60)}h ${driveMinutes % 60}m`
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            <Sparkles size={14} /> Interests
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleInterest(c.id)}
                className={cn(
                  "h-10 px-4 rounded-full text-[13px] font-semibold transition-all active:scale-95",
                  interests.includes(c.id) ? "bg-accent text-accent-foreground" : "glass hairline text-muted-foreground"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={curate}
          disabled={!isDriveActive}
          className={cn(
            "w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-transform",
            isDriveActive
              ? "bg-gradient-to-r from-accent to-cyan-500 text-accent-foreground active:scale-[0.98]"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <RouteIcon size={18} />
          {isDriveActive ? "Fill the drive" : "Set a drive first"}
        </button>
      </div>

      {suggestions && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-display text-[20px] font-bold tracking-tight">Your route</h2>
              <p className="text-[12px] text-muted-foreground font-semibold">
                {suggestions.length} stops · {Math.floor(totalMin / 60)}h {totalMin % 60}m of listening
              </p>
            </div>
            <button
              onClick={saveCurrent}
              className={cn(
                "h-11 px-4 rounded-2xl font-bold text-[13px] flex items-center gap-2 active:scale-95 transition-transform",
                savedFlash ? "bg-emerald-500 text-white" : "glass hairline"
              )}
            >
              {savedFlash ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save trip</>}
            </button>
          </div>
          <div className="space-y-2.5">
            {suggestions.map((item, i) => (
              <div key={item.id} className="relative pl-1">
                <div className="flex items-stretch gap-3">
                  <div className="flex flex-col items-center pt-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground text-[11px] font-bold">{i + 1}</span>
                    {i < suggestions.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 pb-1">
                    <ItemRow item={item} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {trips.length > 0 && (
        <section>
          <h2 className="text-display text-[20px] font-bold tracking-tight mb-3">Saved trips</h2>
          <div className="space-y-2.5">
            {trips.map((trip) => {
              const stops = trip.stops ?? [];
              return (
                <div key={trip.id} className="glass hairline rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[15px] font-bold flex items-center gap-1.5"><MapPin size={14} className="text-accent" /> {trip.destination || "Untitled trip"}</p>
                      <p className="text-[12px] text-muted-foreground font-semibold mt-0.5">
                        {/* driveMinutes is only on trips saved since the drive
                            became the source; older ones just show their stops. */}
                        {trip.driveMinutes
                          ? `${Math.floor(trip.driveMinutes / 60)}h ${trip.driveMinutes % 60}m drive · `
                          : ""}
                        {stops.length} stop{stops.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button onClick={() => deleteTrip(trip.id)} aria-label="Delete trip" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {trip.interests.map((id) => (
                      <span key={id} className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-semibold">
                        {CATEGORIES.find((c) => c.id === id)?.name}
                      </span>
                    ))}
                  </div>
                  {stops.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {stops.slice(0, 2).map((s) => (
                        <button key={s.id} onClick={() => startPlaying(s)} className="w-full flex items-center gap-2 text-left active:scale-[0.98] transition-transform">
                          <span className="w-2 h-2 rounded-full bg-accent" />
                          <span className="text-[13px] font-medium truncate">{s.title}</span>
                        </button>
                      ))}
                      {stops.length > 2 && <p className="text-[12px] text-muted-foreground font-semibold pl-4">+{stops.length - 2} more stops</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}