//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react-swc';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import VitePluginFonts from 'unplugin-fonts/vite';
import { VitePWA } from 'vite-plugin-pwa';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/ui-theme/plugin';

import { createConfig as createTestConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const PACKAGE_VERSION = require('./package.json').version;

// https://vitejs.dev/config
export default defineConfig({
  root: dirname,
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
    plugins: () => [TopLevelAwaitPlugin(), WasmPlugin()],
  },
  plugins: [
    {
      name: 'package-version',
      config: () => ({
        define: {
          'process.env.PACKAGE_VERSION': `'${PACKAGE_VERSION}'`,
        },
      }),
    },
    ConfigPlugin({
      root: dirname,
      env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'PACKAGE_VERSION'],
    }),
    ThemePlugin({
      root: dirname,
      content: [
        path.resolve(dirname, './index.html'),
        path.resolve(dirname, './src/**/*.{js,ts,jsx,tsx}'),
        path.resolve(dirname, '../plugins/*/src/**/*.{js,ts,jsx,tsx}'),
      ],
    }),
    TopLevelAwaitPlugin(),
    WasmPlugin(),
    react({
      tsDecorators: true,
      plugins: [
        // https://github.com/XantreDev/preact-signals/tree/main/packages/react#how-parser-plugins-works
        ['@preact-signals/safe-react/swc', { mode: 'all' }],
      ],
    }),
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
     * https://www.npmjs.com/package/unplugin-fonts
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

        const outDir = path.join(dirname, 'out');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      },
    },
  ],
  ...createTestConfig({ dirname, node: true, storybook: true }),
});
