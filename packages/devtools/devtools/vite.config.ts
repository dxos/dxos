//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { dxosPlugin } from '@dxos/vite-plugin';
import packageJson from './package.json';

const env = (value?: string) => (value ? `"${value}"` : undefined);

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  define: {
    'process.env.TELEMETRY_API_KEY': env(process.env.TELEMETRY_API_KEY),
    'process.env.IPDATA_API_KEY': env(process.env.IPDATA_API_KEY)
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/async',
      '@dxos/client',
      '@dxos/client-services',
      '@dxos/codec-protobuf',
      '@dxos/config',
      '@dxos/credentials',
      '@dxos/debug',
      '@dxos/devtools-mesh',
      '@dxos/feed-store',
      '@dxos/keys',
      '@dxos/messaging',
      '@dxos/messenger-model',
      '@dxos/model-factory',
      '@dxos/network-manager',
      '@dxos/object-model',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-client',
      '@dxos/react-components',
      '@dxos/react-registry-client',
      '@dxos/react-toolkit',
      '@dxos/registry-client',
      '@dxos/rpc',
      '@dxos/text-model'
    ]
  },
  build: {
    commonjsOptions: {
      include: [/packages/, /node_modules/]
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
        name: 'DXOS Devtools',
        short_name: 'Devtools',
        description: 'DXOS Devtools Application',
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
  ],
  worker: {
    plugins: [dxosPlugin()]
  }
});
