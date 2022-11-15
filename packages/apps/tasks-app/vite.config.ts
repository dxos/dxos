//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { themePlugin } from '@dxos/react-ui/plugin';
import { dxosPlugin } from '@dxos/vite-plugin';

const env = (value?: string) => value ? `"${value}"` : undefined;
const DX_RELEASE = process.env.NODE_ENV === 'production'
  ? `@dxos/tasks-app@${packageJson.version}`
  : undefined;

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  define: {
    'process.env.DX_VAULT': env(process.env.DX_VAULT),
    'process.env.DX_ENVIRONMENT': env(process.env.DX_ENVIRONMENT),
    'process.env.DX_RELEASE': env(DX_RELEASE),
    'process.env.SENTRY_DESTINATION': env(process.env.SENTRY_DESTINATION),
    'process.env.TELEMETRY_API_KEY': env(process.env.TELEMETRY_API_KEY),
    'process.env.IPDATA_API_KEY': env(process.env.IPDATA_API_KEY)
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/client',
      '@dxos/config',
      '@dxos/react-appkit',
      '@dxos/react-client',
      '@dxos/react-ui',
      '@dxos/react-uikit',
      '@dxos/sentry'
    ]
  },
  build: {
    outDir: 'out/tasks',
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    }
  },
  plugins: [
    dxosPlugin(),
    themePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-uikit/dist/**/*.js'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.js')
      ]
    }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DXOS Tasks',
        short_name: 'Tasks',
        description: 'DXOS Tasks Application',
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
