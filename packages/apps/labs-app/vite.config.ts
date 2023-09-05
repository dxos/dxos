//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
// import mkcert from 'vite-plugin-mkcert';
import { VitePWA } from 'vite-plugin-pwa';

import { ThemePlugin } from '@dxos/aurora-theme/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

const { osThemeExtension } = require('@dxos/react-shell/theme-extensions');

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    // https: true,
    // NOTE: Relative to project root.
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
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
    },
  },
  plugins: [
    // mkcert(),
    ConfigPlugin({
      env: [
        'DX_DEBUG', 'DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'DX_VAULT'
      ],
    }),
    ThemePlugin({
      root: __dirname,
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@braneframe/plugin-chess/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-debug/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-grid/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-kanban/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-map/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-markdown/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-sketch/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-space/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-splitview/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-template/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-theme/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-thread/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-treeview/dist/lib/**/*.mjs'),
        // TODO(burdon): Required until integrated with theme.
        resolve(__dirname, './node_modules/@dxos/aurora-grid/dist/lib/**/*.mjs'),
      ],
      extensions: [osThemeExtension],
    }),
    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({ jsxRuntime: 'classic' }),
    VitePWA({
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DXOS Labs',
        short_name: 'Labs',
        description: 'DXOS Labs Application',
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
      project: 'labs-app',
      sourcemaps: {
        assets: './packages/apps/labs-app/out/labs/**',
      },
      authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
      dryRun: process.env.DX_ENVIRONMENT !== 'production',
    }),
  ],
});
