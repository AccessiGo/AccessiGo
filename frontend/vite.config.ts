/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy backend endpoints for local dev so API + static assets resolve correctly.
const backendTarget = process.env.BACKEND_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/upload': backendTarget,
      '/static': backendTarget
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
