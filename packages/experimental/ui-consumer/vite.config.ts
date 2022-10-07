//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import {resolve} from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { themePlugin } from '@dxos/react-ui/plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    force: true,
    include: ['@dxos/react-ui']
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
    themePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}')
      ]
    }),
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
