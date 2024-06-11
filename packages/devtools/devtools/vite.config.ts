//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { VitePluginFonts } from 'vite-plugin-fonts';
import { VitePWA } from 'vite-plugin-pwa';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

const PACKAGE_VERSION = require('./package.json').version;

// https://vitejs.dev/config
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true,
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
          vendor: ['react', 'react-router-dom', 'react-dom'],
        },
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [
      TopLevelAwaitPlugin(),
      WasmPlugin(),
    ],
  },
  plugins: [
    {
      name: 'package-version',
      config: () => ({
        define: {
          'process.env.PACKAGE_VERSION': `'${PACKAGE_VERSION}'`,
        }
      })
    },
    ConfigPlugin({ env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'DX_DATADOG_API_KEY', 'DX_DATADOG_APP_KEY', 'DX_DATADOG_PROXY', 'PACKAGE_VERSION'] }),
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
    ReactPlugin({ jsxRuntime: 'classic' }),
    VitePWA({
      // TODO(wittjosiah): Remove once this has been released.
      selfDestroying: true,
      // TODO(wittjosiah): Bundle size is massive.
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000,
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
    /**
     * Bundle fonts.
     * https://fonts.google.com
     * https://www.npmjs.com/package/vite-plugin-fonts
     */
    VitePluginFonts({
      google: {
        injectTo: 'head-prepend',
        // prettier-ignore
        families: [
          'Roboto',
          'Roboto Mono',
          'DM Sans',
          'DM Mono',
          'Montserrat'
        ],
      },
      custom: {
        preload: false,
        injectTo: 'head-prepend',
        families: [
          {
            name: 'Sharp Sans',
            src: 'node_modules/@dxos/brand/assets/fonts/sharp-sans/*.ttf',
          },
        ],
      },
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
