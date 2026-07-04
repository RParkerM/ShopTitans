import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fan-kit image assets live in public/fan-kit and are served at /fan-kit/... in
// both dev and production builds. (Previously a dev-only middleware streamed them
// from an external folder, which did not exist in production hosting.)
export default defineConfig({
  plugins: [react()],
  // Pin the dev port so the Google OAuth "Authorized JavaScript origin"
  // (http://localhost:5173) stays valid. strictPort fails loudly instead of
  // drifting to another port if 5173 is taken.
  server: {
    port: 5173,
    strictPort: true,
  },
})
