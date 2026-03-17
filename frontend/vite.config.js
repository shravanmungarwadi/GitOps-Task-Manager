// vite.config.js
// Vite is the build tool for our React app.
// In DEVELOPMENT: this proxy forwards any request starting with /api
// to our backend running on port 5000.
// In PRODUCTION (Docker): Nginx handles the proxy instead.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000, // Frontend runs on port 3000 locally
    proxy: {
      // Any request to /api/... gets forwarded to the backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // DO NOT rewrite the path — backend expects /api/... prefix
      },
    },
  },

  build: {
    outDir: 'dist', // Output folder that Nginx will serve
  },
});