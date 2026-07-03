import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fan-kit image assets live in public/fan-kit and are served at /fan-kit/... in
// both dev and production builds. (Previously a dev-only middleware streamed them
// from an external folder, which did not exist in production hosting.)
export default defineConfig({
  plugins: [react()],
})
