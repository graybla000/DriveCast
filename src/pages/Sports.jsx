import React, { useState } from "react";
import { Trophy, Star, Headphones, Youtube } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { SPORTS, teamsForSport, youtubeQueryForSport, podcastQueryForSport } from "@/lib/sports";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import TeamPicker from "@/components/TeamPicker";
import VideoRow from "@/components/VideoRow";
import EpisodeRow from "@/components/EpisodeRow";
import { cn } from "@/lib/utils";

/**
 * Sports, split by sport, with a favourite team per sport.
 *
 * Setting a team changes that sport's search from league-wide to team-specific, so
 * a Mariners pick fills the baseball row with Mariners content. Each sport keeps
 * its own team, so a Mariners row and a Seahawks row appear together rather than
 * one replacing the other.
 *
 * Only sports with a team chosen are loaded by default. Every row is a live
 * search, so rendering all five unprompted would spend five searches on content
 * nobody asked for — the rest are opt-in via "show all".
 */
export default function Sports() {
  const { isDriveActive } = useAppStore();
  const { teamFor, setTeam, hasAnyTeam } = useFavoriteTeams();
  const [source, setSource] = useState(isDriveActive ? "audio" : "video");
  const [showAll, setShowAll] = useState(!hasAnyTeam);

  const withTeams = SPORTS.filter((s) => teamFor(s.id));
  const visible = showAll ? SPORTS : withTeams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-[32px] font-extrabold tracking-tight leading-tight flex items-center gap-2">
          <Trophy size={26} className="text-accent" /> Sports
        </h1>
        <p className="text-muted-foreground text-[13px] font-medium">
          Pick your teams and the rows follow them
        </p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-2xl glass hairline">
        {[
          { id: "audio", label: "Podcasts", icon: <Headphones size={14} /> },
          { id: "video", label: "Videos", icon: <Youtube size={14} /> },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setSource(option.id)}
            className={cn(
              "flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-bold transition-all",
              source === option.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            {option.icon} {option.label}
          </button>
        ))}
      </div>

      {/* Team pickers, all five always shown so a team can be set without
          loading that sport's content first. */}
      <section className="glass hairline rounded-2xl p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          <Star size={13} /> Your teams
        </h2>
        {SPORTS.map((sport) => (
          <div key={sport.id} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[13px] font-semibold">{sport.name}</span>
            <div className="flex-1 min-w-0">
              <TeamPicker
                teams={teamsForSport(sport.id)}
                value={teamFor(sport.id)}
                onChange={(team) => setTeam(sport.id, team)}
                placeholder={`Any ${sport.league} team`}
              />
            </div>
          </div>
        ))}
      </section>

      {visible.map((sport) => {
        const team = teamFor(sport.id);
        return (
          <section key={sport.id}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-display text-[20px] font-bold tracking-tight">
                {team ?? sport.name}
              </h2>
              {team && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-accent">
                  <Star size={11} className="fill-current" /> {sport.name}
                </span>
              )}
            </div>
            {source === "audio" ? (
              <EpisodeRow query={podcastQueryForSport(sport.id, team)} category="sports" />
            ) : (
              <VideoRow query={youtubeQueryForSport(sport.id, team)} category="sports" />
            )}
          </section>
        );
      })}

      {!showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full h-12 rounded-2xl glass hairline text-[13px] font-semibold text-muted-foreground active:scale-[0.98] transition-transform"
        >
          Show all sports
        </button>
      )}

      {visible.length === 0 && (
        <p className="text-[13px] text-muted-foreground font-medium text-center py-6">
          Pick a team above, or show all sports.
        </p>
      )}
    </div>
  );
}
