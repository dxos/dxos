//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    port: 3967
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/client',
      '@dxos/keys',
      '@dxos/log',
      '@dxos/config',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-client',
      '@dxos/react-components',
      '@dxos/react-toolkit',
      '@dxos/rpc',
      '@dxos/rpc-tunnel',
      '@dxos/util'
    ]
  },
  build: {
    commonjsOptions: {
      include: [
        /packages/,
        /node_modules/
      ]
    }
  },
  plugins: [
    dxosPlugin(__dirname),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // TODO(wittjosiah): Bundle size is massive.
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'HALO',
        short_name: 'HALO',
        description: 'DXOS HALO Application',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icons/icon-32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256.png',
            sizes: '256x256',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
