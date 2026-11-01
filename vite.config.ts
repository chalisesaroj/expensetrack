import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Use relative base for local dev & preview, or /expensetrack/ for GitHub Pages
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const base = process.env.VITE_BASE || (isGitHubActions ? '/expensetrack/' : './');

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
      manifest: {
        id: isGitHubActions ? '/expensetrack/' : './',
        name: 'Budget Book',
        short_name: 'BudgetBook',
        description: 'Personal and household annual budget tracker and expense log.',
        theme_color: '#0B5D57',
        background_color: '#EEF2F1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: isGitHubActions ? '/expensetrack/' : './',
        scope: isGitHubActions ? '/expensetrack/' : './',
        icons: [
          {
            src: isGitHubActions ? '/expensetrack/pwa-192x192.png' : './pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: isGitHubActions ? '/expensetrack/pwa-512x512.png' : './pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: isGitHubActions ? '/expensetrack/pwa-maskable-512x512.png' : './pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  base,
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
