import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // The "@/…" imports used throughout src/ were previously resolved by the
    // base44 Vite plugin; declared here now that the plugin is gone.
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
