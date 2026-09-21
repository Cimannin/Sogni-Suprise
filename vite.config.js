import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pre-bundle three.js when the dev server starts. Otherwise Vite finds it later
  // (when the game screen loads) and reloads the page, sending visitors back to the gate.
  optimizeDeps: { include: ['three'] },
})
