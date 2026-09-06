// Centralized content catalog for DriveCast.
// Scalable: swap this static module for an API/AI recommendation service later
// without touching UI components — they only consume these shapes.

// Order here drives display order everywhere: the Home category row, the quick
// filter pills, and the Explore filter sheet all map over this array. The
// technical categories lead deliberately.
export const CATEGORIES = [
  { id: "manufacturing", name: "Manufacturing", icon: "Factory", gradient: "from-orange-500/80 to-amber-700/80", count: 29 },
  { id: "cnc", name: "CNC Machining", icon: "Drill", gradient: "from-sky-500/80 to-indigo-700/80", count: 26 },
  { id: "engineering", name: "Engineering", icon: "Cog", gradient: "from-slate-400/80 to-slate-700/80", count: 34 },
  { id: "history", name: "History", icon: "Landmark", gradient: "from-amber-500/80 to-orange-700/80", count: 42 },
  { id: "science", name: "Science", icon: "Atom", gradient: "from-cyan-500/80 to-blue-700/80", count: 38 },
  { id: "space", name: "Space", icon: "Rocket", gradient: "from-indigo-500/80 to-purple-800/80", count: 27 },
  { id: "business", name: "Business", icon: "Briefcase", gradient: "from-emerald-500/80 to-teal-700/80", count: 31 },
  { id: "nature", name: "Nature", icon: "Trees", gradient: "from-green-500/80 to-emerald-800/80", count: 35 },
  { id: "roadside", name: "Roadside Attractions", icon: "Compass", gradient: "from-rose-500/80 to-red-700/80", count: 24 },
  { id: "gems", name: "Hidden Gems", icon: "Gem", gradient: "from-fuchsia-500/80 to-pink-700/80", count: 19 },
];

export const TRENDING = ["CNC Machining", "Engineering", "Space", "Manufacturing"];

export const RECENT_SEARCHES_DEFAULT = [
  "CNC feeds and speeds",
  "5-axis machining",
  "GD&T basics",
  "Black holes explained",
];

// A single content item shape used across Home, Explore, Favorites, Trip Planner.
// type: podcast | lesson | attraction | trail | museum
// Every item needs a `youtubeId` to be playable — see scripts/fetch-youtube-ids.mjs.
export const ITEMS = [
  {
    id: "it_01",
    youtubeId: "LV801eQzUQ0",
    type: "podcast",
    title: "The Fall of Rome: An Empire's Last Day",
    description: "A vivid, narrative retelling of the final hours of the Western Roman Empire and the chain of decisions that ended an era.",
    category: "history",
    duration: 42,
    distance: null,
    rating: 4.8,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-amber-600 via-orange-700 to-red-900",
    host: "Dan Carlin",
  },
  {
    id: "it_02",
    youtubeId: "1LYSfpKog4w",
    type: "podcast",
    title: "Black Holes: The Edge of What We Know",
    description: "Astronomers unpack event horizons, Hawking radiation, and the first image of a supermassive black hole.",
    category: "space",
    duration: 38,
    distance: null,
    rating: 4.9,
    kidFriendly: true,
    free: true,
    setting: "indoor",
    gradient: "from-indigo-600 via-purple-800 to-slate-900",
    host: "StarTalk",
  },
  {
    id: "it_03",
    youtubeId: "oR3r57z81bE",
    type: "attraction",
    title: "Cadillac Ranch",
    description: "Ten graffiti-covered Cadillacs buried nose-down in a Texas wheat field — an iconic, free roadside art installation.",
    category: "roadside",
    duration: 20,
    distance: 3,
    rating: 4.6,
    kidFriendly: true,
    free: true,
    setting: "outdoor",
    gradient: "from-rose-500 via-red-600 to-orange-800",
    location: "Amarillo, TX",
  },
  {
    id: "it_04",
    youtubeId: "l8zKjchR8hM",
    type: "trail",
    title: "Emerald Pool Loop Trail",
    description: "A moderate 3-mile loop to a hidden emerald swimming hole surrounded by old-growth forest.",
    category: "nature",
    duration: 90,
    distance: 12,
    rating: 4.7,
    kidFriendly: true,
    free: true,
    setting: "outdoor",
    gradient: "from-green-500 via-emerald-700 to-teal-900",
    location: "Columbia River Gorge",
  },
  {
    id: "it_05",
    youtubeId: "xRY82CZODDg",
    type: "podcast",
    title: "How Compound Interest Built Empires",
    description: "The surprising history of interest, debt, and the financial instruments that quietly shaped civilization.",
    category: "business",
    duration: 35,
    distance: null,
    rating: 4.5,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-emerald-500 via-teal-700 to-cyan-900",
    host: "Planet Money",
  },
  {
    id: "it_06",
    youtubeId: "dYE14rq6-v4",
    type: "museum",
    title: "Museum of Jurassic Technology",
    description: "A cabinet-of-curiosities museum blending real artifacts with beguiling fiction — an unforgettable, uncanny visit.",
    category: "gems",
    duration: 60,
    distance: 8,
    rating: 4.8,
    kidFriendly: false,
    free: false,
    setting: "indoor",
    gradient: "from-fuchsia-600 via-purple-800 to-indigo-900",
    location: "Los Angeles, CA",
  },
  {
    id: "it_07",
    youtubeId: "UKbrwPL3wXE",
    type: "podcast",
    title: "CRISPR and the Code of Life",
    description: "How a bacterial defense system became the most powerful gene-editing tool in history — and where it's headed.",
    category: "science",
    duration: 47,
    distance: null,
    rating: 4.7,
    kidFriendly: true,
    free: true,
    setting: "indoor",
    gradient: "from-cyan-500 via-blue-700 to-indigo-900",
    host: "Radiolab",
  },
  {
    id: "it_08",
    youtubeId: "JJoXHys0QBU",
    type: "attraction",
    title: "Mystery Hole — Gravity Gone Wrong",
    description: "A classic roadside oddity where water flows uphill and the laws of physics feel optional. Pure roadside kitsch.",
    category: "roadside",
    duration: 25,
    distance: 5,
    rating: 4.3,
    kidFriendly: true,
    free: false,
    setting: "indoor",
    gradient: "from-orange-500 via-amber-700 to-rose-900",
    location: "Ansted, WV",
  },
  {
    id: "it_09",
    youtubeId: "xlwTQh0yKbE",
    type: "trail",
    title: "Sunset Ridge Overlook Hike",
    description: "A short, steep climb to a panoramic ridge overlooking the valley — best timed for golden hour.",
    category: "nature",
    duration: 75,
    distance: 18,
    rating: 4.9,
    kidFriendly: false,
    free: true,
    setting: "outdoor",
    gradient: "from-amber-500 via-orange-700 to-red-900",
    location: "Blue Ridge Parkway",
  },
  {
    id: "it_10",
    youtubeId: "dpmo0Iy9nNw",
    type: "podcast",
    title: "The Apollo Program: Voices from Mission Control",
    description: "Original audio and untold stories from the engineers who put humans on the Moon.",
    category: "space",
    duration: 52,
    distance: null,
    rating: 4.9,
    kidFriendly: true,
    free: true,
    setting: "indoor",
    gradient: "from-slate-600 via-indigo-800 to-purple-900",
    host: "NASA's Curious Universe",
  },
  {
    id: "it_11",
    youtubeId: "M-SHfj3E8YQ",
    type: "museum",
    title: "National Air and Space Museum",
    description: "The world's largest collection of historic aircraft and spacecraft — from the Wright Flyer to Apollo 11.",
    category: "history",
    duration: 120,
    distance: 22,
    rating: 4.8,
    kidFriendly: true,
    free: true,
    setting: "indoor",
    gradient: "from-blue-600 via-indigo-800 to-slate-900",
    location: "Washington, DC",
  },
  {
    id: "it_12",
    youtubeId: "6VioXfmXcLs",
    type: "attraction",
    title: "The World's Largest Ball of Twine",
    description: "A monument to American roadside ambition — one town's giant, twine-wound claim to fame. Free and bizarre.",
    category: "gems",
    duration: 15,
    distance: 40,
    rating: 4.2,
    kidFriendly: true,
    free: true,
    setting: "outdoor",
    gradient: "from-yellow-500 via-amber-700 to-orange-900",
    location: "Cawker City, KS",
  },
  {
    id: "it_13",
    youtubeId: "l3inbx2jeZU",
    type: "podcast",
    title: "The Psychology of Pricing",
    description: "Why $9.99 feels so much cheaper than $10 — the behavioral science behind every price tag you see.",
    category: "business",
    duration: 29,
    distance: null,
    rating: 4.6,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-teal-500 via-emerald-700 to-green-900",
    host: "Choiceology",
  },
  {
    id: "it_14",
    youtubeId: "2zzn3uJPvIU",
    type: "trail",
    title: "Old Growth Cathedral Grove",
    description: "An easy, flat walk through 800-year-old redwoods — a humbling, silent cathedral of nature.",
    category: "nature",
    duration: 45,
    distance: 30,
    rating: 4.9,
    kidFriendly: true,
    free: true,
    setting: "outdoor",
    gradient: "from-green-600 via-emerald-800 to-slate-900",
    location: "Redwood National Park",
  },
  {
    id: "it_15",
    youtubeId: "7CPv0NSIG2M",
    type: "podcast",
    title: "Plate Tectonics: The Slow Dance of Continents",
    description: "How drifting plates built the mountains you drive through — and the earthquakes that reshape the map.",
    category: "science",
    duration: 41,
    distance: null,
    rating: 4.7,
    kidFriendly: true,
    free: true,
    setting: "indoor",
    gradient: "from-cyan-600 via-teal-800 to-slate-900",
    host: "Science Friday",
  },
  {
    id: "it_16",
    youtubeId: "rmOLuZ8XYPs",
    type: "attraction",
    title: "Wigwam Village Motel #6",
    description: "Sleep in a concrete teepee along historic Route 66 — one of the last surviving wigwam motels in America.",
    category: "roadside",
    duration: 30,
    distance: 55,
    rating: 4.4,
    kidFriendly: true,
    free: false,
    setting: "outdoor",
    gradient: "from-rose-600 via-red-800 to-amber-900",
    location: "Holbrook, AZ",
  },

  // Technical learning. These are `lesson` items: video-first teaching content
  // rather than narrative podcasts. youtubeId values are filled in by
  // scripts/fetch-youtube-ids.mjs, never hand-written.
  {
    id: "it_17",
    youtubeId: "FNYEXjRmDtI",
    type: "lesson",
    title: "How CNC Machines Actually Work",
    description: "From G-code to closed-loop servos — a walkthrough of what happens between a toolpath and a finished part.",
    category: "cnc",
    duration: 25,
    distance: null,
    rating: 4.8,
    kidFriendly: true,
    free: true,
    setting: "indoor",
    gradient: "from-sky-600 via-blue-800 to-indigo-900",
    host: "Concerning Reality",
  },
  {
    id: "it_18",
    youtubeId: "-aObuoV0Kmw",
    type: "lesson",
    title: "Feeds and Speeds, Properly Explained",
    description: "Surface speed, chip load, and why the right numbers save both your tool and your cycle time.",
    category: "cnc",
    duration: 32,
    distance: null,
    rating: 4.9,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-cyan-600 via-sky-800 to-slate-900",
    host: "Machining-Tutorials",
  },
  {
    id: "it_19",
    youtubeId: "TRmvk6Mw03Y",
    type: "lesson",
    title: "5-Axis Machining: What Changes",
    description: "Why simultaneous motion beats 3+2, where it earns its cost, and the fixturing that makes it work.",
    category: "cnc",
    duration: 28,
    distance: null,
    rating: 4.7,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-indigo-600 via-violet-800 to-slate-900",
    host: "Protolabs",
  },
  {
    id: "it_20",
    youtubeId: "G7wnGeR_69k",
    type: "lesson",
    title: "GD&T From First Principles",
    description: "Datums, feature control frames, and why true position beats stacked plus-minus tolerances.",
    category: "engineering",
    duration: 38,
    distance: null,
    rating: 4.8,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-slate-500 via-slate-700 to-slate-900",
    host: "The Efficient Engineer",
  },
  {
    id: "it_21",
    youtubeId: "GSXZipWl0fU",
    type: "lesson",
    title: "Tolerance Stack-Up Analysis",
    description: "Worst-case versus RSS, and how a stack-up quietly decides whether an assembly goes together at all.",
    category: "engineering",
    duration: 30,
    distance: null,
    rating: 4.6,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-zinc-500 via-slate-700 to-neutral-900",
    host: "R. Dean Odell",
  },
  {
    id: "it_22",
    youtubeId: "HQl6ZnXwplM",
    type: "lesson",
    title: "Design for Manufacturability",
    description: "The geometry choices that decide cost before anyone quotes the part — draft, radii, wall thickness, access.",
    category: "engineering",
    duration: 34,
    distance: null,
    rating: 4.7,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-teal-600 via-slate-700 to-slate-900",
    host: "Protolabs",
  },
  {
    id: "it_23",
    youtubeId: "J4AsaPVgmq0",
    type: "lesson",
    title: "Spline Cutting on Production Equipment",
    description: "A close look at high-volume spline cutting — the tooling, work holding, and setup behind a repeatable precision feature.",
    category: "manufacturing",
    duration: 45,
    distance: null,
    rating: 4.8,
    kidFriendly: true,
    free: true,
    setting: "indoor",
    gradient: "from-orange-600 via-amber-800 to-stone-900",
    host: "MMW Auto Industries",
  },
  {
    id: "it_24",
    youtubeId: "19XZ4jwrXe0",
    type: "lesson",
    title: "Additive Manufacturing for Metal Parts",
    description: "DMLS, binder jetting, and where printed metal genuinely beats subtractive — plus where it still doesn't.",
    category: "manufacturing",
    duration: 36,
    distance: null,
    rating: 4.6,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-amber-600 via-orange-800 to-red-900",
    host: "Tri-Tech 3D",
  },
  {
    id: "it_25",
    youtubeId: "0agL-nQeoYg",
    type: "lesson",
    title: "Lean Manufacturing and Takt Time",
    description: "Flow, WIP limits, and the arithmetic that tells you whether a line can actually hit its rate.",
    category: "manufacturing",
    duration: 29,
    distance: null,
    rating: 4.5,
    kidFriendly: false,
    free: true,
    setting: "indoor",
    gradient: "from-yellow-600 via-amber-800 to-stone-900",
    host: "LeanActivity",
  },
];

export const FILTER_OPTIONS = {
  category: CATEGORIES.map((c) => ({ id: c.id, label: c.name })),
  duration: [
    { id: "short", label: "Under 30 min" },
    { id: "medium", label: "30–60 min" },
    { id: "long", label: "Over 60 min" },
  ],
  distance: [
    { id: "near", label: "Under 10 mi" },
    { id: "mid", label: "10–30 mi" },
    { id: "far", label: "Over 30 mi" },
  ],
  toggles: [
    { id: "kidFriendly", label: "Kid friendly" },
    { id: "free", label: "Free" },
    { id: "indoor", label: "Indoor" },
    { id: "outdoor", label: "Outdoor" },
    { id: "highlyRated", label: "Highly rated" },
    { id: "openNow", label: "Open now" },
  ],
};

export function getItemById(id) {
  return ITEMS.find((i) => i.id === id);
}

export function itemsByCategory(catId) {
  return ITEMS.filter((i) => i.category === catId);
}

export function applyFilters(items, filters) {
  return items.filter((item) => {
    if (filters.category && filters.category.length && !filters.category.includes(item.category)) return false;
    if (filters.duration?.length) {
      const match = filters.duration.some((d) => {
        if (d === "short") return item.duration < 30;
        if (d === "medium") return item.duration >= 30 && item.duration <= 60;
        if (d === "long") return item.duration > 60;
        return false;
      });
      if (!match) return false;
    }
    if (filters.distance?.length && item.distance != null) {
      const match = filters.distance.some((d) => {
        if (d === "near") return item.distance < 10;
        if (d === "mid") return item.distance >= 10 && item.distance <= 30;
        if (d === "far") return item.distance > 30;
        return false;
      });
      if (!match) return false;
    }
    if (filters.toggles?.kidFriendly && !item.kidFriendly) return false;
    if (filters.toggles?.free && !item.free) return false;
    if (filters.toggles?.indoor && item.setting !== "indoor") return false;
    if (filters.toggles?.outdoor && item.setting !== "outdoor") return false;
    if (filters.toggles?.highlyRated && item.rating < 4.7) return false;
    return true;
  });
}

export function searchItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ITEMS.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      (i.location || "").toLowerCase().includes(q) ||
      (i.host || "").toLowerCase().includes(q)
  );
}

// Wild Card "Surprise Me" — returns a random item, optionally local-biased.
export function surpriseMe(preferLocal = false) {
  const pool = preferLocal ? ITEMS.filter((i) => i.distance != null && i.distance < 30) : ITEMS;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  return choice;
}