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
function serverDevApi(mode) {
  return {
    name: "server-dev-api",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), "");
      // Server-only keys, deliberately un-prefixed so Vite can't inline them.
      for (const name of ["YOUTUBE_API_KEY", "GOOGLE_MAPS_API_KEY"]) {
        if (env[name] && !process.env[name]) process.env[name] = env[name];
      }

      // Both endpoints share the production handlers, so dev and prod can't drift.
      const mount = (route, moduleId, exportName) => {
        server.middlewares.use(route, async (req, res) => {
          try {
            // Loaded lazily so handler edits are picked up without a stale copy.
            const mod = await server.ssrLoadModule(moduleId);
            const { status, body } = await mod[exportName](req.originalUrl ?? req.url);
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: { kind: "unknown", message: err.message } }));
          }
        });
      };

      mount("/api/search", "/server/youtubeSearch.js", "handleSearchRequest");
      mount("/api/route", "/server/driveTime.js", "handleRouteRequest");
      mount("/api/places", "/server/places.js", "handlePlacesRequest");
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [serverDevApi(mode), react()],
  resolve: {
    // The "@/…" imports used throughout src/ were previously resolved by the
    // base44 Vite plugin; declared here now that the plugin is gone.
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
