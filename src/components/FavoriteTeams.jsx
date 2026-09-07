import React from "react";
import { Star } from "lucide-react";
import { SPORTS, teamsForSport } from "@/lib/sports";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import TeamPicker from "@/components/TeamPicker";

/**
 * Favorite team per sport. Shared by the Sports screen and Profile, so the same
 * configuration is reachable from either — one implementation, one storage key,
 * no chance of the two drifting apart.
 *
 * `bare` drops the card chrome and heading, for when the parent already provides
 * a titled container (Profile's settings sections do).
 */
export default function FavoriteTeams({ bare = false }) {
  const { teamFor, setTeam } = useFavoriteTeams();

  const pickers = (
    <div className="space-y-3">
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
    </div>
  );

  if (bare) return <div className="px-4 py-3.5">{pickers}</div>;

  return (
    <section className="glass hairline rounded-2xl p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
        <Star size={13} /> Your teams
      </h2>
      {pickers}
    </section>
  );
}
