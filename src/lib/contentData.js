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
  },
  {
    id: "cnc",
    name: "CNC Machining",
    icon: "Drill",
    gradient: "from-sky-500/80 to-indigo-700/80",
    query: "CNC machining tutorial explained",
    podcastQuery: "machining",
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
];

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);

/** The YouTube query for a category id, falling back to its name. */
export function queryForCategory(id) {
  const category = getCategory(id);
  return category?.query ?? category?.name ?? "";
}

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
