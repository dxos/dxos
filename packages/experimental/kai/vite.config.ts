//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { ThemePlugin } from '@dxos/react-ui/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

import packageJson from './package.json';

const env = (value?: string) => (value ? `"${value}"` : undefined);
const DX_RELEASE = process.env.NODE_ENV === 'production' ? `@dxos/tasks-app@${packageJson.version}` : undefined;

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  define: {
    'process.env.LOG_FILTER': env(process.env.LOG_FILTER),
    'process.env.LOG_BROWSER_PREFIX': env(process.env.LOG_BROWSER_PREFIX),
    'process.env.DX_VAULT': env(process.env.DX_VAULT),
    'process.env.DX_ENVIRONMENT': env(process.env.DX_ENVIRONMENT),
    'process.env.DX_RELEASE': env(DX_RELEASE)
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/client',
      '@dxos/config',
      '@dxos/echo',
      '@dxos/echo-db2',
      '@dxos/log',
      '@dxos/protocols',
      '@dxos/react-appkit',
      '@dxos/react-client',
      '@dxos/react-list',
      '@dxos/react-ui',
      '@dxos/react-uikit'
    ]
  },
  build: {
    outDir: 'out/tasks',
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    }
  },
  plugins: [
    ConfigPlugin(),
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-uikit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-list/dist/**/*.mjs')
      ]
    }),
    ReactPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DXOS Kai',
        short_name: 'Kai',
        description: 'DXOS Kai Demo',
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
