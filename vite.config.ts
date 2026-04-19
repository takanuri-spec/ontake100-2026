import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ontake100 2026',
        short_name: 'Ontake100',
        description: 'OSJ ONTAKE 100 2026 準備・レース・振り返りプラットフォーム',
        theme_color: '#1a3a2a',
        background_color: '#0f1f17',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cyberjapandata2\.gsi\.go\.jp\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'gsi-tiles', expiration: { maxAgeSeconds: 86400 * 7 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
