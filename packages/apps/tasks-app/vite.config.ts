//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { ThemePlugin } from '@dxos/aurora-theme/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: './key.pem',
            cert: './cert.pem',
          }
        : false,
    fs: {
      allow: [
        // TODO(wittjosiah): Not detecting pnpm-workspace?
        //   https://vitejs.dev/config/server-options.html#server-fs-allow
        searchForWorkspaceRoot(process.cwd()),
      ],
    },
  },
  build: {
    sourcemap: true,
    outDir: 'out/tasks',
  },
  plugins: [
    ConfigPlugin({
      env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'DX_VAULT'],
    }),
    ThemePlugin({
      root: __dirname,
      content: [resolve(__dirname, './index.html'), resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}')],
    }),
    // https://github.com/preactjs/signals/issues/269
ReactPlugin({ jsxRuntime: 'classic' }),
    VitePWA({
      // TODO(wittjosiah): Remove.
      selfDestroying: true,
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000,
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
            type: 'image/png',
          },
          {
            src: 'icons/icon-256.png',
            sizes: '256x256',
            type: 'image/png',
          },
        ],
      },
    }),
    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    sentryVitePlugin({
      org: 'dxos',
      project: 'tasks-app',
      sourcemaps: {
        assets: './packages/apps/tasks-app/out/tasks/**',
      },
      authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
      dryRun: process.env.DX_ENVIRONMENT !== 'production',
    }),
  ],
});
