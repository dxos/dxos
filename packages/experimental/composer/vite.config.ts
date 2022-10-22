//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { themePlugin } from '@dxos/react-ui/plugin';
import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig((env) => ({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/client',
      '@dxos/config',
      '@dxos/debug',
      '@dxos/react-client',
      '@dxos/react-ui',
      '@dxos/react-uikit',
      '@dxos/text-model'
    ],
    esbuildOptions: {
      plugins: [
        {
          name: 'yjs',
          setup: ({ onResolve }) => {
            onResolve({ filter: /yjs/ }, () => {
              return { path: require.resolve('yjs').replace('.cjs', '.mjs') }
            })
          }
        }
      ]
    }
  },
  build: {
    outDir: 'out',
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    }
  },
  plugins: [
    dxosPlugin(),
    react(),
    themePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, 'node_modules/@dxos/react-uikit/dist/**/*.js'),
      ]
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DXOS UI composer experiment',
        short_name: 'Composer',
        description: 'DXOS UI composer experiment',
        theme_color: '#ffffff'
      }
    })
  ]
}));
