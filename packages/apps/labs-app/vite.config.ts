//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
// import mkcert from 'vite-plugin-mkcert';
import { VitePWA } from 'vite-plugin-pwa';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

const { osThemeExtension } = require('@dxos/react-shell/theme-extensions');

// https://vitejs.dev/config
export default defineConfig({
  base: process.env.BASE_URL ?? './packages/apps/labs-app/out/labs',
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
    rollupOptions: {
      input: {
        main: resolve(__dirname, './index.html'),
        'script-frame': resolve(__dirname, './script-frame/index.html'),
      }
    }
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
    },
  },
  plugins: [
    { 
      // Required for the script plugin.
      name: "sandbox-importmap-integration",
      transformIndexHtml() {
        return [{
          tag: 'script',
          injectTo: 'head-prepend', // Inject before vite's built-in scripts.
          children: `
            if(window.location.hash.includes('importMap')) {
              const urlParams = new URLSearchParams(window.location.hash.slice(1));
              if(urlParams.get('importMap')) {
                const importMap = JSON.parse(decodeURIComponent(urlParams.get('importMap')));
                
                const mapElement = document.createElement('script');
                mapElement.type = 'importmap';
                mapElement.textContent = JSON.stringify(importMap, null, 2);
                document.head.appendChild(mapElement);
              }
            }
          `
        }];
      }
    },

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
        resolve(__dirname, './node_modules/@braneframe/plugin-*/dist/lib/**/*.mjs'),

        // TODO(burdon): Reconcile vs. direct deps.
        resolve(__dirname, './node_modules/@braneframe/plugin-grid/node_modules/@dxos/react-ui-mosaic/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-stack/node_modules/@dxos/react-ui-stack/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-navtree/node_modules/@dxos/react-ui-navtree/dist/lib/**/*.mjs'),

        // TODO(burdon): Hoisted as direct dependencies.
        resolve(__dirname, './node_modules/@dxos/devtools/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui-mosaic/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui-table/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/vault/dist/lib/**/*.mjs'),
      ],
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
        description: 'DXOS Labs',
        theme_color: '#003E70',
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
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    sentryVitePlugin({
      org: 'dxos',
      project: 'labs-app', // TODO(burdon): Consistent naming (e.g., labs.dxos.org?)
      sourcemaps: {
        assets: './packages/apps/labs-app/out/labs/**',
      },
      authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
      dryRun: process.env.DX_ENVIRONMENT !== 'production',
    }),
  ],
});
