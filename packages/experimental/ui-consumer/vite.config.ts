//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import {dxosUiPlugin} from '@dxos/ui-theme-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    include: []
  },
  build: {
    outDir: 'out/experimental/app/ui-consumer',
    commonjsOptions: {
      include: [
        /packages/,
        /node_modules/
      ]
    }
  },
  plugins: [
    react(),
    dxosUiPlugin({content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']}),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DXOS UI consumer experiment',
        short_name: 'UI test',
        description: 'DXOS UI consumer experiment',
        theme_color: '#ffffff'
      }
    })
  ]
});
