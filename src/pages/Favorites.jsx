import React, { useState } from "react";
import { Heart, Map, Trash2, Bookmark } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { getItemById, CATEGORIES } from "@/lib/contentData";
import ItemRow from "@/components/ItemRow";
import { cn } from "@/lib/utils";

export default function Favorites() {
  const { favorites, clearFavorites, trips, deleteTrip } = useAppStore();
  const [tab, setTab] = useState("items");

  const favItems = favorites.map(getItemById).filter(Boolean);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-display text-[32px] font-extrabold tracking-tight leading-tight">Favorites</h1>
        <p className="text-muted-foreground text-[13px] font-medium">Saved podcasts, places & trips</p>
      </div>

      <div className="flex gap-2 p-1 rounded-2xl glass hairline">
        <TabButton active={tab === "items"} onClick={() => setTab("items")} icon={<Heart size={16} />} label={`Items (${favItems.length})`} />
        <TabButton active={tab === "trips"} onClick={() => setTab("trips")} icon={<Map size={16} />} label={`Trips (${trips.length})`} />
      </div>

      {tab === "items" ? (
        favItems.length ? (
          <>
            <div className="space-y-2.5">
              {favItems.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </div>
            <button
              onClick={clearFavorites}
              className="w-full h-12 rounded-2xl glass hairline flex items-center justify-center gap-2 text-[13px] font-semibold text-muted-foreground active:scale-[0.98] transition-transform"
            >
              <Trash2 size={15} /> Clear all favorites
            </button>
          </>
        ) : (
          <EmptyState icon={<Heart size={28} />} title="No favorites yet" subtitle="Tap the heart on anything you love to save it here." />
        )
      ) : trips.length ? (
        <div className="space-y-2.5">
          {trips.map((trip) => (
            <div key={trip.id} className="glass hairline rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[15px] font-bold">{trip.destination}</p>
                  <p className="text-[12px] text-muted-foreground font-semibold mt-0.5">{trip.stops.length} stops</p>
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
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Map size={28} />} title="No saved trips yet" subtitle="Plan a trip and save it to find it here later." />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold transition-all",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      )}
    >
      {icon} {label}
    </button>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl glass hairline text-muted-foreground mb-4">{icon}</div>
      <h3 className="text-display text-[20px] font-bold tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-[14px] font-medium mt-1.5 max-w-xs">{subtitle}</p>
    </div>
  );
}