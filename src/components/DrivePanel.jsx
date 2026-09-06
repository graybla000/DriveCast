import React, { useState } from "react";
import { Car, MapPin, X, AlertCircle, CreditCard, KeyRound, Navigation, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { mapLinks } from "@/hooks/useDriveTime";
import { cn } from "@/lib/utils";

const formatDrive = (minutes) => {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

// Set the current drive, and show it once set. The drive time becomes a ceiling
// on video length everywhere else in the app.
export default function DrivePanel() {
  const { drive, driveMinutes, driveLoading, driveError, lookupDrive, clearDrive } = useAppStore();
  const [origin, setOrigin] = useState(drive?.origin ?? "");
  const [destination, setDestination] = useState(drive?.destination ?? "");

  const submit = (e) => {
    e.preventDefault();
    lookupDrive(origin, destination);
  };

  const links = driveMinutes ? mapLinks(drive.origin, drive.destination) : null;

  // Distinct icons for the setup problems, since each needs a different fix.
  const ErrorIcon =
    driveError?.kind === "no_key" || driveError?.kind === "bad_key"
      ? KeyRound
      : driveError?.kind === "billing"
        ? CreditCard
        : AlertCircle;

  return (
    <div className="glass hairline rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-display text-[17px] font-bold tracking-tight">
          <Car size={17} className="text-accent" /> Your drive
        </h2>
        {driveMinutes ? (
          <button
            onClick={clearDrive}
            className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground active:scale-95 transition-transform"
          >
            <X size={13} /> Clear
          </button>
        ) : null}
      </div>

      {driveMinutes ? (
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
            Only showing content that fits in {formatDrive(driveMinutes)}.
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
        </>
      ) : (
        <form onSubmit={submit} className="space-y-2">
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
                <Car size={16} /> Get drive time
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
