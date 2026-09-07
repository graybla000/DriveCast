// Category presets for DriveCast.
//
// There is no content catalog any more — every item the app shows comes live
// from the YouTube Data API (see src/lib/youtube.js). What lives here is the
// curated part: which topics to offer, and the search query behind each one.
//
// Order drives display order everywhere: the Home category row, the quick
// filter pills, and the Explore filter sheet all map over CATEGORIES. The
// technical categories lead deliberately.

export const CATEGORIES = [
  {
    id: "manufacturing",
    name: "Manufacturing",
    icon: "Factory",
    gradient: "from-orange-500/80 to-amber-700/80",
    query: "manufacturing process explained factory production",
    podcastQuery: "manufacturing",
    sectorAware: true,
    sectorBase: "manufacturing",
  },
  {
    id: "cnc",
    name: "CNC Machining",
    icon: "Drill",
    gradient: "from-sky-500/80 to-indigo-700/80",
    query: "CNC machining tutorial explained",
    podcastQuery: "machining",
    sectorAware: true,
    sectorBase: "CNC machining",
  },
  {
    id: "engineering",
    name: "Engineering",
    icon: "Cog",
    gradient: "from-slate-400/80 to-slate-700/80",
    // Deliberately broad. This previously read "...explained GD&T tolerance
    // design", which baked one topic into the search and made every result a
    // GD&T video. A category query should describe the FIELD, not a subject
    // inside it — the specific stuff is what the search box is for.
    query: "mechanical engineering explained how it works",
    podcastQuery: "engineering",
    sectorAware: true,
    sectorBase: "engineering",
  },
  {
    id: "history",
    name: "History",
    icon: "Landmark",
    gradient: "from-amber-500/80 to-orange-700/80",
    query: "history documentary full episode",
    podcastQuery: "history",
  },
  {
    id: "science",
    name: "Science",
    icon: "Atom",
    gradient: "from-cyan-500/80 to-blue-700/80",
    query: "science explained documentary",
    podcastQuery: "science",
  },
  {
    id: "space",
    name: "Space",
    icon: "Rocket",
    gradient: "from-indigo-500/80 to-purple-800/80",
    query: "space astronomy documentary explained",
    podcastQuery: "space astronomy",
  },
  {
    id: "business",
    name: "Business",
    icon: "Briefcase",
    gradient: "from-emerald-500/80 to-teal-700/80",
    query: "business economics explained documentary",
    podcastQuery: "business",
    sectorAware: true,
    sectorBase: "business",
  },
  {
    id: "nature",
    name: "Nature",
    icon: "Trees",
    gradient: "from-green-500/80 to-emerald-800/80",
    query: "nature documentary wildlife",
    podcastQuery: "nature",
  },
  {
    id: "roadside",
    name: "Roadside Attractions",
    icon: "Compass",
    gradient: "from-rose-500/80 to-red-700/80",
    query: "roadside attractions america road trip",
    podcastQuery: "road trip travel",
  },
  {
    id: "gems",
    name: "Hidden Gems",
    icon: "Gem",
    gradient: "from-fuchsia-500/80 to-pink-700/80",
    query: "hidden gems unusual places documentary",
    podcastQuery: "travel stories",
  },
  {
    id: "sports",
    name: "Sports",
    icon: "Trophy",
    gradient: "from-lime-500/80 to-green-700/80",
    query: "sports analysis breakdown documentary",
    podcastQuery: "sports",
  },
  {
    id: "woodworking",
    name: "DIY Woodworking",
    icon: "Hammer",
    gradient: "from-amber-600/80 to-yellow-800/80",
    query: "woodworking project build how to",
    // Short and show-oriented: the podcast directory matches show titles, so
    // "woodworking" finds the actual shows where a longer phrase wouldn't.
    podcastQuery: "woodworking",
  },
  {
    id: "ai",
    name: "AI",
    icon: "BrainCircuit",
    gradient: "from-violet-500/80 to-purple-700/80",
    // Describes the field rather than a topic inside it — the mistake that made
    // every Engineering result a GD&T video.
    query: "artificial intelligence explained how it works",
    podcastQuery: "artificial intelligence",
    sectorAware: true,
    sectorBase: "artificial intelligence",
  },
];

/**
 * Industry sectors, chosen in Profile, that narrow the technical categories.
 *
 * Picking Aerospace makes the Manufacturing row aerospace manufacturing and the
 * Engineering row aerospace engineering. Only categories flagged `sectorAware`
 * below are affected — an industry has nothing useful to say about History or
 * Sports, and folding it in would just produce worse searches.
 */
export const SECTORS = [
  { id: "aerospace", name: "Aerospace", term: "aerospace" },
  { id: "automotive", name: "Automotive", term: "automotive" },
  { id: "medical", name: "Medical Devices", term: "medical device" },
  { id: "semiconductor", name: "Semiconductors", term: "semiconductor" },
  { id: "energy", name: "Energy", term: "energy" },
  { id: "defense", name: "Defense", term: "defense" },
  { id: "construction", name: "Construction", term: "construction" },
  { id: "marine", name: "Marine", term: "marine" },
  { id: "robotics", name: "Robotics", term: "robotics" },
  { id: "food", name: "Food & Beverage", term: "food production" },
];

export const getSector = (id) => SECTORS.find((s) => s.id === id);

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);

/**
 * The YouTube query for a category, optionally narrowed to an industry sector.
 *
 * With a sector chosen, a sector-aware category swaps its broad query for
 * "<sector> <base> explained" — so Aerospace turns Manufacturing into aerospace
 * manufacturing and Engineering into aerospace engineering. The short `sectorBase`
 * is used rather than appending to the full query, because stacking two long
 * phrases ("aerospace manufacturing process explained factory production") dilutes
 * the search rather than focusing it.
 *
 * Categories without `sectorAware` ignore the sector entirely.
 */
export function queryForCategory(id, sectorId = null) {
  const category = getCategory(id);
  if (!category) return "";

  const sector = sectorId ? getSector(sectorId) : null;
  if (sector && category.sectorAware && category.sectorBase) {
    return `${sector.term} ${category.sectorBase} explained`;
  }
  return category.query ?? category.name ?? "";
}

/**
 * All queries for a category given the selected sectors — ONE PER SECTOR.
 *
 * Separate searches rather than a combined query: "aerospace automotive
 * manufacturing" dilutes the search, while "aerospace manufacturing" and
 * "automotive manufacturing" run independently both return sharp results, and the
 * row merges them. Costs one search per sector, which is why the caller caps how
 * many sectors are active.
 *
 * Returns a single-element array when there are no sectors, or the category
 * ignores them.
 */
export function queriesForCategory(id, sectorIds = []) {
  const category = getCategory(id);
  if (!category) return [];

  const usable = (sectorIds ?? []).filter((s) => getSector(s));
  if (!usable.length || !category.sectorAware || !category.sectorBase) {
    return [queryForCategory(id)];
  }
  return usable.map((s) => queryForCategory(id, s));
}

/** Whether a sector selection changes what this category returns. */
export const isSectorAware = (id) => Boolean(getCategory(id)?.sectorAware);

/**
 * The podcast query for a category id.
 *
 * Deliberately separate from the YouTube one. The podcast directory matches show
 * titles and authors, not episode content, so the long descriptive phrases that
 * work for YouTube return junk here — "CNC machining tutorial explained" surfaced
 * a woodworking show and an actor interview, while plain "machining" returns
 * Machine Shop Mastery and Swarfcast.
 */
export function podcastQueryForCategory(id) {
  const category = getCategory(id);
  return category?.podcastQuery ?? category?.name ?? "";
}

// Which categories get their own row on Home. Each one is a live search, so
// keep this short — every row costs quota on a cache miss.
export const FEATURED_CATEGORY_IDS = ["cnc", "manufacturing", "engineering"];

export const RECENT_SEARCHES_DEFAULT = [
  "CNC feeds and speeds",
  "5-axis machining",
  "GD&T basics",
  "tolerance stack up",
];

// Filters that actually mean something for YouTube results. The old catalog also
// filtered on distance/kidFriendly/free/setting — none of which the API provides,
// so offering them would have been fiction.
export const FILTER_OPTIONS = {
  category: CATEGORIES.map((c) => ({ id: c.id, label: c.name })),
  duration: [
    { id: "short", label: "Under 20 min" },
    { id: "medium", label: "20–60 min" },
    { id: "long", label: "Over 60 min" },
  ],
};

const inDurationBucket = (minutes, bucket) => {
  if (bucket === "short") return minutes < 20;
  if (bucket === "medium") return minutes >= 20 && minutes <= 60;
  if (bucket === "long") return minutes > 60;
  return true;
};

/** Client-side refinement of whatever the API returned. */
export function applyFilters(videos, filters) {
  return videos.filter((video) => {
    if (filters?.duration?.length && !filters.duration.some((b) => inDurationBucket(video.duration, b))) {
      return false;
    }
    return true;
  });
}

/** Wild Card: a random pick from whatever is currently loaded. */
export function surpriseFrom(videos) {
  if (!videos?.length) return null;
  return videos[Math.floor(Math.random() * videos.length)];
}
