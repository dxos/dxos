//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { join, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

const { osThemeExtension } = require('@dxos/react-shell/theme-extensions');

// https://vitejs.dev/config/
export default defineConfig({
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
    rollupOptions: {
      input: {
        main: resolve(__dirname, './index.html'),
        'script-frame': resolve(__dirname, './script-frame/index.html'),
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          dxos: ['@dxos/react-client'],
          ui: ['@dxos/react-ui', '@dxos/react-ui-theme'],
          editor: ['@dxos/react-ui-editor'],
        },
      },
    },
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
    },
  },
  plugins: [
    // Required for the script plugin.
    {
      name: 'sandbox-importmap-integration',
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
    ConfigPlugin({
      env: [
        'DX_DEBUG', 'DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'DX_VAULT'
      ],
    }),
    ThemePlugin({
      extensions: [osThemeExtension],
      root: __dirname,
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@braneframe/plugin-*/dist/lib/**/*.mjs'),

        // TODO(burdon): Indirect deps.
        resolve(__dirname, './node_modules/@braneframe/plugin-grid/node_modules/@dxos/react-ui-mosaic/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-layout/node_modules/@dxos/react-ui-mosaic/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-navtree/node_modules/@dxos/react-ui-navtree/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-stack/node_modules/@dxos/react-ui-stack/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-table/node_modules/@dxos/react-ui-table/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-table/node_modules/@dxos/react-ui-table/node_modules/@dxos/react-ui-searchlist/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-debug/node_modules/@dxos/devtools/dist/lib/**/*.mjs'),

        // TODO(burdon): Hoisted as direct deps.
        resolve(__dirname, './node_modules/@dxos/devtools/dist/lib/**/*.mjs'),
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
        name: 'DXOS Composer',
        short_name: 'Composer',
        description: 'DXOS Composer Application',
        theme_color: '#003E70',
        icons: [
          {
            src: 'favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
          },
          {
            src: 'favicon-32x32.png',
            sizes: '32x32',
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
      project: 'composer-app',
      sourcemaps: {
        assets: './packages/apps/composer-app/out/composer/**',
      },
      authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
      dryRun: process.env.DX_ENVIRONMENT !== 'production',
    }),
    // https://www.bundle-buddy.com/rollup
    {
      name: 'bundle-buddy',
      buildEnd() {
        const deps: { source: string; target: string }[] = [];
        for (const id of this.getModuleIds()) {
          const m = this.getModuleInfo(id);
          if (m != null && !m.isExternal) {
            for (const target of m.importedIds) {
              deps.push({ source: m.id, target });
            }
          }
        }

        const outDir = join(__dirname, 'out');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      },
    },
  ],
});
