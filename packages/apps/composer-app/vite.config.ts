//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react-swc';
import { join, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';
import Inspect from 'vite-plugin-inspect';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

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
        : undefined,
    fs: {
      strict: false,
      cachedChecks: false,
      allow: [
        // TODO(wittjosiah): Not detecting pnpm-workspace?
        //   https://vitejs.dev/config/server-options.html#server-fs-allow
        searchForWorkspaceRoot(process.cwd()),
      ],
    },
  },
  build: {
    sourcemap: true,
    minify: process.env.DX_ENVIRONMENT === 'development' ? false : undefined,
    rollupOptions: {
      input: {
        internal: resolve(__dirname, './internal.html'),
        main: resolve(__dirname, './index.html'),
        shell: resolve(__dirname, './shell.html'),
        devtools: resolve(__dirname, './devtools.html'),
        'script-frame': resolve(__dirname, './script-frame/index.html'),
      },
      output: {
        // Generate nicer chunk names. Default makes most chunks have names like index-[hash].js.
        chunkFileNames,
        manualChunks: {
          react: ['react', 'react-dom'],
          dxos: ['@dxos/react-client'],
          ui: ['@dxos/react-ui', '@dxos/react-ui-theme'],
          editor: ['@dxos/react-ui-editor'],
        },
      },
      external: [
        // Provided at runtime by socket supply shell.
        'socket:application',
      ],
    },
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
    },
  },
  worker: {
    format: 'es',
    plugins: () => [TopLevelAwaitPlugin(), WasmPlugin()],
  },
  plugins: [
    tsconfigPaths({
      projects: ['../../../tsconfig.paths.json'],
    }),
    ConfigPlugin(),
    ThemePlugin({
      root: __dirname,
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, '../plugins/*/src/**/*.{js,ts,jsx,tsx}'),
      ],
    }),
    TopLevelAwaitPlugin(),
    WasmPlugin(),
    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({
      plugins: [
        [
          '@dxos/swc-log-plugin',
          {
            symbols: [
              {
                function: 'log',
                package: '@dxos/log',
                param_index: 2,
                include_args: false,
                include_call_site: true,
              },
              {
                function: 'invariant',
                package: '@dxos/invariant',
                param_index: 2,
                include_args: true,
                include_call_site: false,
              },
            ],
          },
        ],
      ],
    }),
    VitePWA({
      // No PWA in dev to make it easier to ensure the latest version is being used.
      // May be mitigated in the future by https://github.com/dxos/dxos/issues/4939.
      // https://vite-pwa-org.netlify.app/guide/unregister-service-worker.html#unregister-service-worker
      selfDestroying:
        process.env.DX_ENVIRONMENT === 'development' ||
        // No PWA for e2e tests because it slows them down (especially waiting to clear toasts).
        process.env.DX_PWA === 'false',
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
      disable: process.env.DX_ENVIRONMENT !== 'production',
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
    // Inspect(),
  ],
});

function chunkFileNames(chunkInfo) {
  if (chunkInfo.facadeModuleId && chunkInfo.facadeModuleId.match(/index.[^\/]+$/gm)) {
    let segments = chunkInfo.facadeModuleId.split('/').reverse().slice(1);
    const nodeModulesIdx = segments.indexOf('node_modules');
    if (nodeModulesIdx !== -1) {
      segments = segments.slice(0, nodeModulesIdx);
    }
    const ignoredNames = ['dist', 'lib', 'browser'];
    const significantSegment = segments.find((segment) => !ignoredNames.includes(segment));
    if (significantSegment) {
      return `assets/${significantSegment}-[hash].js`;
    }
  }

  return 'assets/[name]-[hash].js';
}
