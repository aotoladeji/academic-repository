import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Build straight into the Laravel app's public/ folder so the whole
    // project deploys to Wasmer as a single PHP app (API + static SPA).
    outDir: '../backend/public',
    emptyOutDir: false,
  },
});
