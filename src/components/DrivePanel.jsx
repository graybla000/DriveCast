import React, { useState } from "react";
import { Car, MapPin, X, AlertCircle, CreditCard, KeyRound, Navigation, Loader2, LocateFixed } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/AppStore";
import PlaceInput from "@/components/PlaceInput";
import { mapLinks } from "@/hooks/useDriveTime";
import { cn } from "@/lib/utils";

const formatDrive = (minutes) => {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

const COORD_RE = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/**
 * Coordinates out of a "lat,lng" string, used to bias destination suggestions
 * toward where the drive starts — so typing "Fred Meyer" surfaces the nearby one
 * rather than whichever Google ranks highest globally.
 */
function coordsFrom(value) {
  const m = String(value ?? "").match(COORD_RE);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * Two shapes, because they belong in different places:
 *
 *  variant="status" — a quiet one-line readout for Home. Shows the live drive if
 *    one is underway, otherwise just says there isn't one. Never a form: asking
 *    for trip details on every visit is noise.
 *  variant="setup"  — the full form, on the Plan tab, where entering a trip is
 *    the point of the screen.
 */
export default function DrivePanel({ variant = "status" }) {
  return variant === "setup" ? <DriveSetup /> : <DriveStatus />;
}

function DriveStatus() {
  const navigate = useNavigate();
  const { drive, driveMinutes, isDriveActive, clearDrive } = useAppStore();

  if (!isDriveActive) {
    return (
      <button
        onClick={() => navigate("/plan")}
        className="w-full flex items-center justify-between px-4 h-12 rounded-2xl glass hairline active:scale-[0.98] transition-transform"
      >
        <span className="flex items-center gap-2.5 text-[13px] font-semibold text-muted-foreground">
          <Car size={15} /> No active drive
        </span>
        <span className="text-[12px] font-bold text-accent">Plan one</span>
      </button>
    );
  }

  const links = mapLinks(drive.origin, drive.destination);

  return (
    <div className="rounded-2xl glass hairline p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
            <Car size={12} /> Your drive
          </p>
          <p className="text-[13px] font-semibold truncate mt-0.5">
            {drive.originLabel || drive.origin} → {drive.destination}
          </p>
        </div>
        {/* Total drive time, not a countdown: the app has no idea how far along
            you are, and showing "minutes left" would be inventing that. */}
        <div className="text-right shrink-0">
          <p className="text-display text-[20px] font-extrabold tracking-tight leading-none">
            {formatDrive(driveMinutes)}
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">drive</p>
        </div>
      </div>

      <p className="text-[11px] font-semibold text-muted-foreground">
        Showing only what fits{drive.distanceMiles ? ` · ${drive.distanceMiles} mi` : ""}
      </p>

      <div className="flex items-center gap-2">
        {links && (
          <>
            <a
              href={links.google}
              target="_blank"
              rel="noreferrer"
              className="flex-1 h-9 rounded-lg glass hairline flex items-center justify-center gap-1.5 text-[11.5px] font-bold active:scale-95 transition-transform"
            >
              <Navigation size={12} /> Google
            </a>
            <a
              href={links.apple}
              target="_blank"
              rel="noreferrer"
              className="flex-1 h-9 rounded-lg glass hairline flex items-center justify-center gap-1.5 text-[11.5px] font-bold active:scale-95 transition-transform"
            >
              <MapPin size={12} /> Apple
            </a>
          </>
        )}
        <button
          onClick={clearDrive}
          aria-label="End drive"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function DriveSetup() {
  const {
    drive,
    driveMinutes,
    isDriveActive,
    driveLoading,
    driveError,
    lookupDrive,
    clearDrive,
    locateMe,
    isLocating,
    locationError,
  } = useAppStore();
  const [origin, setOrigin] = useState(drive?.origin ?? "");
  const [destination, setDestination] = useState(drive?.destination ?? "");
  // Set when the origin is coordinates from the browser, so the UI can show
  // "Current location" instead of a raw lat/lng pair.
  const [originLabel, setOriginLabel] = useState(drive?.originLabel ?? null);
  // Set only when a suggestion was picked, so routing can use the exact place
  // rather than re-resolving the text.
  const [originPlaceId, setOriginPlaceId] = useState(null);
  const [destinationPlaceId, setDestinationPlaceId] = useState(null);

  const useMyLocation = async () => {
    const coords = await locateMe();
    if (coords) {
      setOrigin(coords);
      setOriginLabel("Current location");
      setOriginPlaceId(null); // coordinates supersede any picked place
    }
  };

  const submit = (e) => {
    e.preventDefault();
    lookupDrive(origin, destination, { originLabel, originPlaceId, destinationPlaceId });
  };

  // Each setup failure needs a different fix, so they get different icons.
  const ErrorIcon =
    driveError?.kind === "no_key" || driveError?.kind === "bad_key"
      ? KeyRound
      : driveError?.kind === "billing"
        ? CreditCard
        : AlertCircle;

  const links = isDriveActive ? mapLinks(drive.origin, drive.destination) : null;

  return (
    <div className="glass hairline rounded-2xl p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-display text-[17px] font-bold tracking-tight">
        <Car size={17} className="text-accent" /> Your drive
      </h2>

      {isDriveActive ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-display text-[30px] font-extrabold tracking-tight text-accent">
              {formatDrive(driveMinutes)}
            </span>
            {drive.distanceMiles ? (
              <span className="text-[13px] font-semibold text-muted-foreground">{drive.distanceMiles} mi</span>
            ) : null}
          </div>
          <p className="text-[12.5px] font-medium text-muted-foreground leading-relaxed">
            {drive.originLabel || drive.origin} → {drive.destination}
          </p>
          <p className="text-[11.5px] font-semibold text-accent">
            Only showing content that fits this drive
          </p>

          {links && (
            <div className="flex items-center gap-2 pt-1">
              <a
                href={links.google}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-11 rounded-xl glass hairline flex items-center justify-center gap-1.5 text-[12.5px] font-bold active:scale-95 transition-transform"
              >
                <Navigation size={14} /> Google Maps
              </a>
              <a
                href={links.apple}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-11 rounded-xl glass hairline flex items-center justify-center gap-1.5 text-[12.5px] font-bold active:scale-95 transition-transform"
              >
                <MapPin size={14} /> Apple Maps
              </a>
            </div>
          )}

          <button
            onClick={clearDrive}
            className="w-full h-11 rounded-xl glass hairline flex items-center justify-center gap-2 text-[13px] font-semibold text-muted-foreground active:scale-[0.98] transition-transform"
          >
            <X size={14} /> End drive
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <p className="text-[12.5px] font-medium text-muted-foreground leading-relaxed">
            Set your route and DriveCast will only suggest content that fits the drive.
          </p>
          <PlaceInput
            value={originLabel ?? origin}
            onChange={(next) => {
              setOrigin(next);
              setOriginLabel(null); // typing replaces the located position
              setOriginPlaceId(null);
            }}
            onSelect={(s) => setOriginPlaceId(s.placeId)}
            placeholder="Start — e.g. Kent, WA"
            // "Current location" is a label for coordinates, not a place to search.
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

          <PlaceInput
            value={destination}
            onChange={(next) => {
              setDestination(next);
              setDestinationPlaceId(null);
            }}
            onSelect={(s) => setDestinationPlaceId(s.placeId)}
            placeholder="Destination — e.g. Portland, OR"
            // Rank destinations near the start of the drive.
            bias={coordsFrom(origin)}
          />
          <button
            type="submit"
            disabled={driveLoading || !origin.trim() || !destination.trim()}
            className={cn(
              "w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-transform",
              driveLoading || !origin.trim() || !destination.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-gradient-to-r from-accent to-cyan-500 text-accent-foreground active:scale-[0.98]"
            )}
          >
            {driveLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Checking traffic…
              </>
            ) : (
              <>
                <Car size={16} /> Start drive
              </>
            )}
          </button>
        </form>
      )}

      {(driveError || locationError) && (
        <div className="flex items-start gap-2 pt-1">
          {driveError ? (
            <ErrorIcon size={14} className="text-destructive mt-0.5 shrink-0" />
          ) : (
            <LocateFixed size={14} className="text-destructive mt-0.5 shrink-0" />
          )}
          <p className="text-[11.5px] font-medium text-muted-foreground leading-relaxed">
            {driveError?.message ?? locationError}
          </p>
        </div>
      )}
    </div>
  );
}
