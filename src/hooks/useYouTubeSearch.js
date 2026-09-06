import { useQueries, useQuery } from "@tanstack/react-query";
import { searchVideos, YT_ERROR } from "@/lib/youtube";

// Twelve hours, matching the localStorage TTL in the client. React Query dedupes
// within a session; the client's cache survives reloads.
const STALE_MS = 12 * 60 * 60 * 1000;

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
    queryFn: () => searchVideos(trimmed, { maxResults, category }),
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
export function useYouTubeSearches(specs = [], { maxResults = 8 } = {}) {
  const results = useQueries({
    queries: specs
      .filter((s) => s.query?.trim())
      .map((s) => ({
        queryKey: ["youtube", s.query.trim().toLowerCase(), maxResults, s.category ?? null],
        queryFn: () => searchVideos(s.query, { maxResults, category: s.category ?? null }),
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
