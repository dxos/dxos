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
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          dxos: ['@dxos/react-client'],
          ui: ['@dxos/react-ui', '@dxos/react-ui-theme'],
          editor: ['@dxos/react-ui-composer'],
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
    ConfigPlugin({
      env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'DX_VAULT'],
    }),
    ThemePlugin({
      root: __dirname,
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@braneframe/plugin-*/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-dnd/node_modules/@dxos/react-ui-grid/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-stack/node_modules/@dxos/react-ui-stack/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-treeview/node_modules/@dxos/react-ui-navtree/dist/lib/**/*.mjs'),
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
