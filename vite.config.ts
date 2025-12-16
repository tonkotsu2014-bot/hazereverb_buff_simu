import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version)
  },
  server: {
    watch: {
      usePolling: true,
    },
    host: true, // Needed for Docker port mapping to work properly
    port: 5173,
  },
})
