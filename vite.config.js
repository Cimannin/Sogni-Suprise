import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pre-bundle three.js when the dev server starts. Otherwise Vite finds it later
  // (when the game screen loads) and reloads the page, sending visitors back to the gate.
  optimizeDeps: { include: ['three'] },
  // The site is hosted at https://<user>.github.io/Sogni-Suprise/, not at the domain root,
  // so every asset URL needs this prefix. Vite adds it automatically to anything it processes
  // (index.html, imported assets), but plain string paths in the code (see BASE_URL below)
  // need it added by hand. Change this if the GitHub repo is ever renamed.
  base: '/Sogni-Suprise/',
})
