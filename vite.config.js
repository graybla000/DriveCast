import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

/**
 * Serves /api/search from the Vite dev server using the same handler the
 * production Express server uses, so `npm run dev` stays a single process and
 * dev/prod can't drift apart.
 *
 * The key is loaded WITHOUT the `VITE_` prefix and pushed into process.env for
 * the handler to read. That's the whole point: Vite inlines VITE_-prefixed
 * variables into the client bundle, so a `VITE_`-named key would ship to the
 * browser — which is what moving search server-side is meant to prevent.
 */
function youtubeSearchDevApi(mode) {
  return {
    name: "youtube-search-dev-api",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), "");
      if (env.YOUTUBE_API_KEY && !process.env.YOUTUBE_API_KEY) {
        process.env.YOUTUBE_API_KEY = env.YOUTUBE_API_KEY;
      }

      server.middlewares.use("/api/search", async (req, res) => {
        // Imported lazily so edits to the handler are picked up on restart
        // without the plugin holding a stale copy.
        const { handleSearchRequest } = await server.ssrLoadModule("/server/youtubeSearch.js");
        const { status, body } = await handleSearchRequest(req.originalUrl ?? req.url);
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(body));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [youtubeSearchDevApi(mode), react()],
  resolve: {
    // The "@/…" imports used throughout src/ were previously resolved by the
    // base44 Vite plugin; declared here now that the plugin is gone.
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
