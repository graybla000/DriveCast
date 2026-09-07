import { useQuery } from "@tanstack/react-query";

// Podcast episodes for one query, via this app's /api/podcasts.
//
// Unlike the YouTube hook there's no quota to defend — the Apple Podcasts
// directory is free and keyless — so retries are allowed and the cache is a
// latency optimisation rather than a cost control. Parsing several feeds is the
// slow part, which is why the window is still generous.
const STALE_MS = 60 * 60 * 1000; // 1h, matching the server cache

export function usePodcastSearch(query, { maxResults = 12, category = null, enabled = true } = {}) {
  const trimmed = (query ?? "").trim();

  const result = useQuery({
    queryKey: ["podcasts", trimmed.toLowerCase(), maxResults, category],
    queryFn: async () => {
      const res = await fetch(
        `/api/podcasts?q=${encodeURIComponent(trimmed)}&maxResults=${maxResults}`
      );
      const payload = await res.json();
      if (!res.ok || payload.error) {
        throw new Error(payload.error?.message ?? `Podcast search failed (${res.status}).`);
      }
      return (payload.episodes ?? []).map((e) => ({ ...e, category }));
    },
    enabled: enabled && trimmed.length > 0,
    staleTime: STALE_MS,
    gcTime: STALE_MS,
    retry: 1,
  });

  return { ...result, episodes: result.data ?? [] };
}
