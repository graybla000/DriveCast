import { useQueries, useQuery } from "@tanstack/react-query";
import { searchVideos, YT_ERROR } from "@/lib/youtube";
import { queryForCategory } from "@/lib/contentData";

// Twelve hours, matching the localStorage TTL in the client. React Query dedupes
// within a session; the client's cache survives reloads.
const STALE_MS = 12 * 60 * 60 * 1000;

/**
 * The category's un-narrowed query, to stand in when `query` itself can't be
 * searched and has nothing cached.
 *
 * Only the caller knows a query came from a category, and only the category knows
 * its broad form — so the pairing is made here rather than in the fetch layer.
 * Returns "" when there's nothing useful to fall back to (no category, or the
 * query already *is* the broad one).
 */
function broaderQueryFor(category, query) {
  if (!category) return "";
  const base = queryForCategory(category);
  return base && base.trim().toLowerCase() !== query.trim().toLowerCase() ? base : "";
}

/**
 * Live YouTube search for one query.
 *
 * Retries are disabled deliberately: every attempt costs 100 quota units, so
 * retrying a failure is the one thing guaranteed to make a quota problem worse.
 */
export function useYouTubeSearch(query, { maxResults = 12, category = null, enabled = true } = {}) {
  const trimmed = (query ?? "").trim();

  const result = useQuery({
    queryKey: ["youtube", trimmed.toLowerCase(), maxResults, category],
    queryFn: () =>
      searchVideos(trimmed, { maxResults, category, fallbackQuery: broaderQueryFor(category, trimmed) }),
    enabled: enabled && trimmed.length > 0,
    staleTime: STALE_MS,
    gcTime: STALE_MS,
    retry: false,
  });

  return {
    ...result,
    videos: result.data ?? [],
    // Callers mostly want to know "can this be fixed by the user or not".
    errorKind: result.error?.kind ?? null,
    isQuotaError: result.error?.kind === YT_ERROR.QUOTA,
    isMissingKey: result.error?.kind === YT_ERROR.NO_KEY,
  };
}

/**
 * Several searches at once, for screens that mix categories (the trip planner).
 * `specs` is [{ query, category }] — keep it short, each distinct query is
 * another 100 units on a cache miss.
 */
export function useYouTubeSearches(specs = [], { maxResults = 8, enabled = true } = {}) {
  const results = useQueries({
    queries: specs
      .filter((s) => s.query?.trim())
      .map((s) => ({
        queryKey: ["youtube", s.query.trim().toLowerCase(), maxResults, s.category ?? null],
        queryFn: () =>
          searchVideos(s.query, {
            maxResults,
            category: s.category ?? null,
            // Sector-narrowed queries arrive here — this is what keeps a lit pill
            // from blanking the row when the quota is gone.
            fallbackQuery: broaderQueryFor(s.category ?? null, s.query),
          }),
        // Lets a caller hold off entirely — quota shouldn't be spent fetching
        // videos when the user has chosen podcasts.
        enabled,
        staleTime: STALE_MS,
        gcTime: STALE_MS,
        retry: false,
      })),
  });

  const firstError = results.find((r) => r.error)?.error ?? null;

  return {
    videos: results.flatMap((r) => r.data ?? []),
    isLoading: results.some((r) => r.isLoading),
    error: firstError,
    isQuotaError: firstError?.kind === YT_ERROR.QUOTA,
    isMissingKey: firstError?.kind === YT_ERROR.NO_KEY,
  };
}
