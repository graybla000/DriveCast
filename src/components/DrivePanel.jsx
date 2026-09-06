import React, { useState } from "react";
import { Car, MapPin, X, AlertCircle, CreditCard, KeyRound, Navigation, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/AppStore";
import { mapLinks } from "@/hooks/useDriveTime";
import { cn } from "@/lib/utils";

const formatDrive = (minutes) => {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

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
  const { drive, driveMinutes, isDriveActive, minutesRemaining, clearDrive } = useAppStore();

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
            <Car size={12} /> Driving now
          </p>
          <p className="text-[13px] font-semibold truncate mt-0.5">
            {drive.origin} → {drive.destination}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-display text-[20px] font-extrabold tracking-tight leading-none">
            {formatDrive(minutesRemaining)}
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">left</p>
        </div>
      </div>

      <p className="text-[11px] font-semibold text-muted-foreground">
        Showing only what fits in {formatDrive(driveMinutes)}
        {drive.distanceMiles ? ` · ${drive.distanceMiles} mi` : ""}
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
  const { drive, driveMinutes, isDriveActive, minutesRemaining, driveLoading, driveError, lookupDrive, clearDrive } =
    useAppStore();
  const [origin, setOrigin] = useState(drive?.origin ?? "");
  const [destination, setDestination] = useState(drive?.destination ?? "");

  const submit = (e) => {
    e.preventDefault();
    lookupDrive(origin, destination);
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
            {drive.origin} → {drive.destination}
          </p>
          <p className="text-[11.5px] font-semibold text-accent">
            {formatDrive(minutesRemaining)} left · only showing content that fits
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
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Start — e.g. Kent, WA"
            className="w-full h-11 px-3.5 rounded-xl bg-muted/50 hairline text-[14px] font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination — e.g. Portland, OR"
            className="w-full h-11 px-3.5 rounded-xl bg-muted/50 hairline text-[14px] font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/50"
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

      {driveError && (
        <div className="flex items-start gap-2 pt-1">
          <ErrorIcon size={14} className="text-destructive mt-0.5 shrink-0" />
          <p className="text-[11.5px] font-medium text-muted-foreground leading-relaxed">{driveError.message}</p>
        </div>
      )}
    </div>
  );
}
