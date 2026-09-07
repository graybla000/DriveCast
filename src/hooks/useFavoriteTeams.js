import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Favorite team per sport: { baseball: "Seattle Mariners", football: "Seattle Seahawks" }
//
// Keyed by sport rather than a single favorite, so each sport can have its own
// and all of them can surface at once — a Mariners row and a Seahawks row
// together, rather than one overriding the other.
const STORAGE_KEY = "drivecast:teams";

export function useFavoriteTeams() {
  const [teams, setTeams] = useLocalStorage(STORAGE_KEY, {});

  const teamFor = useCallback((sportId) => teams?.[sportId] ?? null, [teams]);

  const setTeam = useCallback(
    (sportId, team) => {
      setTeams((prev) => {
        const next = { ...(prev ?? {}) };
        // An empty selection clears rather than storing a blank, so `teamFor`
        // stays a clean "set or not".
        if (team) next[sportId] = team;
        else delete next[sportId];
        return next;
      });
    },
    [setTeams]
  );

  const clearTeams = useCallback(() => setTeams({}), [setTeams]);

  return {
    teams: teams ?? {},
    teamFor,
    setTeam,
    clearTeams,
    hasAnyTeam: Object.keys(teams ?? {}).length > 0,
  };
}
