// Deterministic shuffling, so content varies between visits without jumping
// around while you're looking at it.
//
// Why seeded rather than Math.random(): the rows re-render constantly (playback
// ticks, drive updates, filter changes). An unseeded shuffle would reorder the
// cards on every one of those, which is unusable. A seed fixed for the page
// session gives a stable order that still differs next time you load the app.

/** Small, fast PRNG (mulberry32). Same seed, same sequence. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates using a seeded generator. Does not mutate the input. */
export function seededShuffle(items, seed) {
  const out = [...(items ?? [])];
  const random = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One seed for this page load. Every row shuffles differently (each mixes in its
 * own query) but consistently for as long as you're on the page; reloading gives
 * a fresh arrangement.
 */
export const SESSION_SEED = Math.floor(Math.random() * 2 ** 31);

/** Turn a string into a seed, so a row's order is tied to its own query. */
export function seedFrom(text, base = SESSION_SEED) {
  let hash = base;
  for (let i = 0; i < String(text).length; i++) {
    hash = (Math.imul(hash, 31) + String(text).charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
