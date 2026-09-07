// Sports subcategories and team lists.
//
// The team lists are static reference data rather than an API call: they're small,
// they change roughly once a season, and an autocomplete over a known list gives
// far better queries than free text ("Marniers" returns nothing useful). Rosters
// do move — franchises relocate and rename — so treat this as needing an
// occasional review rather than as permanently correct.

export const SPORTS = [
  {
    id: "football",
    name: "Football",
    league: "NFL",
    // Used when no favourite team is set.
    query: "NFL football analysis breakdown",
    podcastQuery: "NFL football",
  },
  {
    id: "baseball",
    name: "Baseball",
    league: "MLB",
    query: "MLB baseball analysis breakdown",
    podcastQuery: "MLB baseball",
  },
  {
    id: "basketball",
    name: "Basketball",
    league: "NBA",
    query: "NBA basketball analysis breakdown",
    podcastQuery: "NBA basketball",
  },
  {
    id: "hockey",
    name: "Hockey",
    league: "NHL",
    query: "NHL hockey analysis breakdown",
    podcastQuery: "NHL hockey",
  },
  {
    id: "soccer",
    name: "Soccer",
    league: "MLS",
    query: "soccer football analysis breakdown",
    podcastQuery: "soccer",
  },
];

export const getSport = (id) => SPORTS.find((s) => s.id === id);

export const TEAMS = {
  NFL: [
    "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills",
    "Carolina Panthers", "Chicago Bears", "Cincinnati Bengals", "Cleveland Browns",
    "Dallas Cowboys", "Denver Broncos", "Detroit Lions", "Green Bay Packers",
    "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Kansas City Chiefs",
    "Las Vegas Raiders", "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins",
    "Minnesota Vikings", "New England Patriots", "New Orleans Saints", "New York Giants",
    "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers", "San Francisco 49ers",
    "Seattle Seahawks", "Tampa Bay Buccaneers", "Tennessee Titans", "Washington Commanders",
  ],
  MLB: [
    "Arizona Diamondbacks", "Atlanta Braves", "Baltimore Orioles", "Boston Red Sox",
    "Chicago Cubs", "Chicago White Sox", "Cincinnati Reds", "Cleveland Guardians",
    "Colorado Rockies", "Detroit Tigers", "Houston Astros", "Kansas City Royals",
    "Los Angeles Angels", "Los Angeles Dodgers", "Miami Marlins", "Milwaukee Brewers",
    "Minnesota Twins", "New York Mets", "New York Yankees", "Philadelphia Phillies",
    "Pittsburgh Pirates", "San Diego Padres", "San Francisco Giants", "Seattle Mariners",
    "St. Louis Cardinals", "Tampa Bay Rays", "Texas Rangers", "Toronto Blue Jays",
    "Washington Nationals", "Athletics",
  ],
  NBA: [
    "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets",
    "Chicago Bulls", "Cleveland Cavaliers", "Dallas Mavericks", "Denver Nuggets",
    "Detroit Pistons", "Golden State Warriors", "Houston Rockets", "Indiana Pacers",
    "LA Clippers", "Los Angeles Lakers", "Memphis Grizzlies", "Miami Heat",
    "Milwaukee Bucks", "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks",
    "Oklahoma City Thunder", "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns",
    "Portland Trail Blazers", "Sacramento Kings", "San Antonio Spurs", "Toronto Raptors",
    "Utah Jazz", "Washington Wizards",
  ],
  NHL: [
    "Anaheim Ducks", "Boston Bruins", "Buffalo Sabres", "Calgary Flames",
    "Carolina Hurricanes", "Chicago Blackhawks", "Colorado Avalanche", "Columbus Blue Jackets",
    "Dallas Stars", "Detroit Red Wings", "Edmonton Oilers", "Florida Panthers",
    "Los Angeles Kings", "Minnesota Wild", "Montreal Canadiens", "Nashville Predators",
    "New Jersey Devils", "New York Islanders", "New York Rangers", "Ottawa Senators",
    "Philadelphia Flyers", "Pittsburgh Penguins", "San Jose Sharks", "Seattle Kraken",
    "St. Louis Blues", "Tampa Bay Lightning", "Toronto Maple Leafs", "Vancouver Canucks",
    "Vegas Golden Knights", "Washington Capitals", "Winnipeg Jets", "Utah Hockey Club",
  ],
  MLS: [
    "Atlanta United", "Austin FC", "CF Montréal", "Charlotte FC", "Chicago Fire",
    "Colorado Rapids", "Columbus Crew", "D.C. United", "FC Cincinnati", "FC Dallas",
    "Houston Dynamo", "Inter Miami", "LA Galaxy", "LAFC", "Minnesota United",
    "Nashville SC", "New England Revolution", "New York City FC", "New York Red Bulls",
    "Orlando City", "Philadelphia Union", "Portland Timbers", "Real Salt Lake",
    "San Diego FC", "San Jose Earthquakes", "Seattle Sounders", "Sporting Kansas City",
    "St. Louis City SC", "Toronto FC", "Vancouver Whitecaps",
  ],
};

export const teamsForSport = (sportId) => TEAMS[getSport(sportId)?.league] ?? [];

/**
 * What to search for a sport, given a favourite team.
 *
 * With a team set the query becomes team-specific, which is the point — the row
 * then returns that team's content rather than league-wide content. Without one it
 * falls back to the league.
 */
export function youtubeQueryForSport(sportId, team) {
  const sport = getSport(sportId);
  if (!sport) return "";
  return team ? `${team} highlights analysis` : sport.query;
}

export function podcastQueryForSport(sportId, team) {
  const sport = getSport(sportId);
  if (!sport) return "";
  // Team podcasts exist for most major franchises; the league term is the fallback.
  return team ? `${team} podcast` : sport.podcastQuery;
}
