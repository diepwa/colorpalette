import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : le build marche sous https://diepwa.github.io/colorpalette/ comme à la racine.
  base: './',
})
