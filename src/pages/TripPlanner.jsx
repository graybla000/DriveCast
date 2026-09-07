import React, { useEffect, useMemo, useState } from "react";
import {
  MapPin, Clock, Sparkles, Save, Trash2, Check, Navigation, LocateFixed,
  Loader2, ChevronLeft, ChevronRight, Car, AlertCircle, CreditCard, KeyRound,
} from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { CATEGORIES, FEATURED_CATEGORY_IDS, queriesForCategory } from "@/lib/contentData";
import { useYouTubeSearches } from "@/hooks/useYouTubeSearch";
import { mapLinks } from "@/hooks/useDriveTime";
import { seededShuffle, seedFrom } from "@/lib/shuffle";
import PlaceInput from "@/components/PlaceInput";
import ItemRow from "@/components/ItemRow";
import { cn } from "@/lib/utils";

// Each distinct category costs another search (100 quota units on a cache miss),
// so the number of interests that actually drive a fetch is capped.
const MAX_INTEREST_FETCHES = 3;

// Look the drive up once both ends are known, without waiting for a button.
const LOOKUP_DEBOUNCE_MS = 700;

const COORD_RE = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** Coordinates from a "lat,lng" string, used to bias destination suggestions. */
function coordsFrom(value) {
  const m = String(value ?? "").match(COORD_RE);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const formatDrive = (minutes) => {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

export default function TripPlanner() {
  const {
    saveTrip, trips, deleteTrip, startPlaying,
    drive, driveMinutes, driveLoading, driveError,
    lookupDrive, locateMe, isLocating, locationError,
    preferredCategories, activeSectors,
  } = useAppStore();

  const [origin, setOrigin] = useState(drive?.origin ?? "");
  const [originLabel, setOriginLabel] = useState(drive?.originLabel ?? null);
  const [originPlaceId, setOriginPlaceId] = useState(null);
  const [destination, setDestination] = useState(drive?.destination ?? "");
  const [destinationPlaceId, setDestinationPlaceId] = useState(null);
  // Pre-selected from the preferences already set in Profile — asking for the
  // same thing twice is the whole problem this avoids. Still editable per trip:
  // the preference is a starting point, not a lock.
  const [interests, setInterests] = useState(() => preferredCategories.slice(0, MAX_INTEREST_FETCHES));
  // Slot index -> chosen video id, when the auto pick has been swapped out.
  const [swaps, setSwaps] = useState({});
  const [savedFlash, setSavedFlash] = useState(false);

  const toggleInterest = (id) =>
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const useMyLocation = async () => {
    const coords = await locateMe();
    if (coords) {
      setOrigin(coords);
      setOriginLabel("Current location");
      setOriginPlaceId(null);
    }
  };

  /**
   * Fill in the current location on arrival, so the common case needs no button.
   *
   * Only when permission is ALREADY granted. Calling getCurrentPosition on a
   * "prompt" state would throw an unsolicited permission dialog at someone who
   * just opened the page, which browsers increasingly penalise and users read as
   * hostile — the button stays for that case.
   */
  useEffect(() => {
    if (origin.trim()) return; // never override a value that's already there
    let cancelled = false;

    (async () => {
      if (!navigator.permissions?.query) return; // Safari may not support it
      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        if (status.state !== "granted" || cancelled) return;
        const coords = await locateMe();
        if (cancelled || !coords) return;
        setOrigin(coords);
        setOriginLabel("Current location");
      } catch {
        // Unsupported or blocked — the button covers it.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Looked up automatically, so the drive time is known by the time the user
  // reaches the bottom of the flow — no separate button to press.
  useEffect(() => {
    if (!origin.trim() || !destination.trim()) return;
    const timer = setTimeout(() => {
      lookupDrive(origin, destination, { originLabel, originPlaceId, destinationPlaceId });
    }, LOOKUP_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, originPlaceId, destinationPlaceId]);

  const fetchIds = (interests.length ? interests : FEATURED_CATEGORY_IDS).slice(0, MAX_INTEREST_FETCHES);
  // 50 per topic costs no more than 8 — quota is per search, not per result — and
  // a deeper pool means better fills and more swap options per slot.
  const pool = useYouTubeSearches(
    // One query per interest per sector, so an aerospace focus narrows the trip's
    // content the same way it narrows the Home rows.
    fetchIds.flatMap((id) =>
      queriesForCategory(id, activeSectors).map((query) => ({ query, category: id }))
    ),
    { maxResults: 50 }
  );

  // Shuffled per page load so planning the same trip twice doesn't produce the
  // identical route.
  const poolVideos = useMemo(
    () => seededShuffle(pool.videos, seedFrom(fetchIds.join(","))),
    [pool.videos, fetchIds.join(",")]
  );

  // Changing the drive or the interests invalidates hand-picked slots.
  useEffect(() => setSwaps({}), [driveMinutes, interests.join(",")]);

  /**
   * The queue that fills the drive: greedy by default, with any swapped slots
   * honoured. Derived rather than built on a button press, so it always agrees
   * with the current drive and interests.
   */
  const queue = useMemo(() => {
    if (!driveMinutes || !poolVideos.length) return [];

    const byId = new Map(poolVideos.map((v) => [v.id, v]));

    // Base fill: greedy over the pool in order, so it's deterministic.
    const base = [];
    let remaining = driveMinutes;
    for (const video of poolVideos) {
      if (remaining <= 0) break;
      if (video.duration <= remaining) {
        base.push(video);
        remaining -= video.duration;
      }
    }

    // Swaps replace their slot IN PLACE. An earlier version inserted swapped
    // picks at the front, which renumbered every slot and changed the queue
    // length — so swapping slot 2 appeared to alter the whole route.
    const result = [...base];
    for (const [key, id] of Object.entries(swaps)) {
      const index = Number(key);
      const swapped = byId.get(id);
      if (!swapped || index >= result.length) continue;
      // Only accept it if it still fits the time the other slots leave free.
      const otherTotal = result.reduce((sum, v, i) => (i === index ? sum : sum + v.duration), 0);
      if (swapped.duration <= driveMinutes - otherTotal) result[index] = swapped;
    }

    return result;
  }, [driveMinutes, poolVideos, swaps]);

  /**
   * Alternatives for one slot: anything not already in the queue that fits the
   * time the other slots leave free. Bounding by the remaining budget means a
   * swap can never push the route past the drive length.
   */
  const alternativesFor = (index) => {
    const current = queue[index];
    if (!current) return [];
    const otherTotal = queue.reduce((sum, v, i) => (i === index ? sum : sum + v.duration), 0);
    const budget = driveMinutes - otherTotal;
    const inQueue = new Set(queue.map((v) => v.id));
    return poolVideos.filter((v) => v.id === current.id || (!inQueue.has(v.id) && v.duration <= budget));
  };

  const swapSlot = (index, direction) => {
    const options = alternativesFor(index);
    if (options.length < 2) return;
    const current = queue[index];
    const at = options.findIndex((v) => v.id === current.id);
    const next = options[(at + direction + options.length) % options.length];
    setSwaps((prev) => ({ ...prev, [index]: next.id }));
  };

  const links = mapLinks(origin, destination);
  const ready = Boolean(driveMinutes && links);
  const totalMin = queue.reduce((a, b) => a + b.duration, 0);

  /**
   * Clicking a map link navigates AND starts the first video.
   *
   * The anchor keeps a real href so the browser opens it natively — deliberately
   * not window.open() after async work, which popup blockers reject once the
   * user's gesture has been consumed.
   */
  const startTrip = () => {
    if (!queue.length) return;
    startPlaying(queue[0]);
    saveTrip({ destination, origin: originLabel || origin, driveMinutes, interests, stops: queue });
  };

  const saveCurrent = () => {
    if (!queue.length) return;
    saveTrip({ destination, origin: originLabel || origin, driveMinutes, interests, stops: queue });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const ErrorIcon =
    driveError?.kind === "no_key" || driveError?.kind === "bad_key"
      ? KeyRound
      : driveError?.kind === "billing"
        ? CreditCard
        : AlertCircle;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-[32px] font-extrabold tracking-tight leading-tight">Plan a drive</h1>
        <p className="text-muted-foreground text-[13px] font-medium">
          Set your route, pick what you're into, then go
        </p>
      </div>

      <div className="space-y-5 glass hairline rounded-3xl p-5">
        <Step n={1} icon={<Car size={13} />} label="Where you're starting">
          <PlaceInput
            value={originLabel ?? origin}
            onChange={(next) => {
              setOrigin(next);
              setOriginLabel(null);
              setOriginPlaceId(null);
            }}
            onSelect={(s) => setOriginPlaceId(s.placeId)}
            placeholder="Start — city or address"
            disableSuggestions={Boolean(originLabel)}
          >
            <button
              type="button"
              onClick={useMyLocation}
              disabled={isLocating}
              aria-label="Use my location"
              title="Use my location"
              className="w-11 h-11 shrink-0 rounded-xl glass hairline flex items-center justify-center text-accent active:scale-90 transition-transform disabled:opacity-50"
            >
              {isLocating ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
            </button>
          </PlaceInput>
          {locationError && (
            <p className="text-[11.5px] font-medium text-destructive mt-1.5 leading-relaxed">{locationError}</p>
          )}
        </Step>

        <Step n={2} icon={<MapPin size={13} />} label="Where you're going">
          <PlaceInput
            value={destination}
            onChange={(next) => {
              setDestination(next);
              setDestinationPlaceId(null);
            }}
            onSelect={(s) => setDestinationPlaceId(s.placeId)}
            placeholder="Destination — city, address or place"
            bias={coordsFrom(origin)}
          />

          {/* Feedback on the drive itself, since it drives everything below. */}
          <div className="mt-2 min-h-[20px]">
            {driveLoading ? (
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> Checking traffic…
              </p>
            ) : driveError ? (
              <p className="flex items-start gap-1.5 text-[11.5px] font-medium text-muted-foreground leading-relaxed">
                <ErrorIcon size={12} className="text-destructive mt-0.5 shrink-0" />
                {driveError.message}
              </p>
            ) : driveMinutes ? (
              <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-accent">
                <Clock size={13} /> {formatDrive(driveMinutes)} drive
                {drive.distanceMiles ? ` · ${drive.distanceMiles} mi` : ""}
              </p>
            ) : null}
          </div>
        </Step>

        <Step n={3} icon={<Sparkles size={13} />} label="What you're into">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleInterest(c.id)}
                className={cn(
                  "h-10 px-4 rounded-full text-[13px] font-semibold transition-all active:scale-95",
                  interests.includes(c.id)
                    ? "bg-accent text-accent-foreground"
                    : "glass hairline text-muted-foreground"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          {interests.length > MAX_INTEREST_FETCHES && (
            <p className="text-[11px] font-medium text-muted-foreground mt-2">
              Using the first {MAX_INTEREST_FETCHES} — each topic is a separate search.
            </p>
          )}
        </Step>
      </div>

      {/* The route, swappable slot by slot. */}
      {ready && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-display text-[20px] font-bold tracking-tight">Your route</h2>
              <p className="text-[12px] text-muted-foreground font-semibold">
                {queue.length} video{queue.length === 1 ? "" : "s"} · {formatDrive(totalMin)} of{" "}
                {formatDrive(driveMinutes)}
              </p>
            </div>
            {queue.length > 0 && (
              <button
                onClick={saveCurrent}
                className={cn(
                  "h-11 px-4 rounded-2xl font-bold text-[13px] flex items-center gap-2 active:scale-95 transition-transform",
                  savedFlash ? "bg-emerald-500 text-white" : "glass hairline"
                )}
              >
                {savedFlash ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save</>}
              </button>
            )}
          </div>

          {pool.isLoading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => <div key={i} className="h-[76px] rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : queue.length === 0 ? (
            <p className="text-[13px] text-muted-foreground font-medium">
              Nothing found short enough for a {formatDrive(driveMinutes)} drive. Try another interest.
            </p>
          ) : (
            <div className="space-y-2.5">
              {queue.map((item, i) => {
                const options = alternativesFor(i);
                const canSwap = options.length > 1;
                return (
                  <div key={`${i}-${item.id}`} className="flex items-stretch gap-2">
                    {/* pt clears the swap controls above, so the number still lines
                        up with the video it labels rather than with the arrows. */}
                    <div className="flex flex-col items-center pt-12 shrink-0">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground text-[11px] font-bold">
                        {i + 1}
                      </span>
                      {i < queue.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Above the video, not below: the arrows change what this
                          slot is, so they read as a control for what follows
                          rather than a comment on it. Swaps are limited to videos
                          that still fit the time the other slots leave free. */}
                      <div className="flex items-center justify-end gap-1.5 mb-1">
                        <button
                          onClick={() => swapSlot(i, -1)}
                          disabled={!canSwap}
                          aria-label={`Previous option for slot ${i + 1}`}
                          className="w-8 h-8 rounded-lg glass hairline flex items-center justify-center text-muted-foreground active:scale-90 transition-transform disabled:opacity-30"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <span className="text-[10.5px] font-semibold text-muted-foreground tabular-nums">
                          {canSwap ? `${options.findIndex((v) => v.id === item.id) + 1}/${options.length}` : "only fit"}
                        </span>
                        <button
                          onClick={() => swapSlot(i, 1)}
                          disabled={!canSwap}
                          aria-label={`Next option for slot ${i + 1}`}
                          className="w-8 h-8 rounded-lg glass hairline flex items-center justify-center text-muted-foreground active:scale-90 transition-transform disabled:opacity-30"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                      <ItemRow item={item} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Step 4 — the last thing on the page: navigate and start listening. */}
      <section className="space-y-2">
        <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          <Navigation size={13} /> Start the drive
        </p>
        {ready ? (
          <>
            <div className="flex items-center gap-2">
              <a
                href={links.google}
                target="_blank"
                rel="noreferrer"
                onClick={startTrip}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-accent to-cyan-500 text-accent-foreground font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Navigation size={17} /> Google Maps
              </a>
              <a
                href={links.apple}
                target="_blank"
                rel="noreferrer"
                onClick={startTrip}
                className="flex-1 h-14 rounded-2xl glass hairline font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <MapPin size={17} /> Apple Maps
              </a>
            </div>
            <p className="text-[11.5px] font-medium text-muted-foreground text-center">
              Opens navigation and starts {queue.length ? `“${queue[0].title.slice(0, 40)}…”` : "your route"}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground font-medium">
            Enter a start and destination to get your drive time.
          </p>
        )}
      </section>

      {trips.length > 0 && (
        <section>
          <h2 className="text-display text-[20px] font-bold tracking-tight mb-3">Saved trips</h2>
          <div className="space-y-2.5">
            {trips.map((trip) => {
              const stops = trip.stops ?? [];
              return (
                <div key={trip.id} className="glass hairline rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold flex items-center gap-1.5 truncate">
                        <MapPin size={14} className="text-accent shrink-0" /> {trip.destination || "Untitled trip"}
                      </p>
                      <p className="text-[12px] text-muted-foreground font-semibold mt-0.5">
                        {/* driveMinutes is only on trips saved since the drive
                            became the source; older ones just show their stops. */}
                        {trip.driveMinutes ? `${formatDrive(trip.driveMinutes)} drive · ` : ""}
                        {stops.length} video{stops.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTrip(trip.id)}
                      aria-label="Delete trip"
                      className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground active:scale-90 transition-transform shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {stops.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {stops.slice(0, 2).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => startPlaying(s)}
                          className="w-full flex items-center gap-2 text-left active:scale-[0.98] transition-transform"
                        >
                          <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                          <span className="text-[13px] font-medium truncate">{s.title}</span>
                        </button>
                      ))}
                      {stops.length > 2 && (
                        <p className="text-[12px] text-muted-foreground font-semibold pl-4">
                          +{stops.length - 2} more
                        </p>
                      )}
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

function Step({ n, icon, label, children }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-bold text-foreground shrink-0">
          {n}
        </span>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}
