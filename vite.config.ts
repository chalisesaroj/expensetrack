import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base so assets load correctly on GitHub Pages (e.g. /expensetracker/)
  // as well as local development and preview environments.
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
