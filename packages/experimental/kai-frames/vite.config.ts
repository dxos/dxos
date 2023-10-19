//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { VitePluginFonts } from 'vite-plugin-fonts';
import mkcert from 'vite-plugin-mkcert';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

// @ts-ignore
// NOTE: Vite requires uncompiled JS.
import { osThemeExtension, kaiThemeExtension } from './theme-extensions';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

/**
 * https://vitejs.dev/config
 */
export default defineConfig({
  server: {
    host: true,
    https: process.env.HTTPS === 'true',
  },

  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          faker: ['faker'],
          highlighter: ['react-syntax-highlighter'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },

  plugins: [
    mkcert(),

    ConfigPlugin({
      env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'DX_VAULT'],
    }),

    // Directories to scan for Tailwind classes.
    ThemePlugin({
      root: __dirname,
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/chess-app/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/mosaic/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/plexus/dist/**/*.mjs'),
      ],
      extensions: [osThemeExtension, kaiThemeExtension],
    }),

    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({ jsxRuntime: 'classic' }),

    // To reset, unregister service worker using devtools.
    VitePWA({
      // TODO(wittjosiah): Remove.
      selfDestroying: true,
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000,
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
          'DM Sans',
          'DM Mono'
        ],
      },

      custom: {
        preload: false,
        injectTo: 'head-prepend',
        families: [
          {
            name: 'Sharp Sans',
            src: 'node_modules/@dxos/react-icons/assets/fonts/sharp-sans/*.ttf',
          },
        ],
      },
    }),

    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    // TODO(wittjosiah): Create sentry project.
    // sentryVitePlugin({
    //   org: 'dxos',
    //   project: 'kai-showcase',
    //   sourcemaps: {
    //     assets: './packages/experimental/kai-frames/out/kai-showcase/**'
    //   },
    //   authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
    //   dryRun: process.env.DX_ENVIRONMENT !== 'production'
    // }),

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
