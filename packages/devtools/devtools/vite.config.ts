//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { VitePluginFonts } from 'vite-plugin-fonts';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/react-components/plugin';
import { kaiThemeExtension } from '@dxos/kai/theme-extensions';
import { osThemeExtension } from '@dxos/react-ui/theme-extensions';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/config',
      '@dxos/keys',
      '@dxos/log',
      '@dxos/protocols',
      '@dxos/protocols/proto/dxos/client',
      '@dxos/protocols/proto/dxos/client/services',
      '@dxos/protocols/proto/dxos/config',
      '@dxos/protocols/proto/dxos/echo/feed',
      '@dxos/protocols/proto/dxos/echo/model/object',
      '@dxos/protocols/proto/dxos/echo/object',
      '@dxos/protocols/proto/dxos/halo/credentials',
      '@dxos/protocols/proto/dxos/halo/invitations',
      '@dxos/protocols/proto/dxos/halo/keys',
      '@dxos/protocols/proto/dxos/mesh/bridge',
      '@dxos/protocols/proto/dxos/rpc'
    ]
  },
  build: {
    sourcemap: true,
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks: {
          faker: ['faker'],
          highlighter: ['react-syntax-highlighter'],
          monaco: ['monaco-editor', '@monaco-editor/react'],
          vendor: ['react', 'react-router-dom', 'react-dom'],
        }
      }
    }
  },
  plugins: [
    ConfigPlugin({ env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY'] }),
    ThemePlugin({
      content: [
        resolve(__dirname, './*.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/chess-app/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-composer/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-list/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/kai/dist/**/*.mjs')
      ],
      extensions: [osThemeExtension, kaiThemeExtension]
    }),
    ReactPlugin(),
    VitePWA({
      // TODO(wittjosiah): Remove once this has been released.
      selfDestroying: true,
      // TODO(wittjosiah): Bundle size is massive.
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
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
            type: 'image/png'
          },
          {
            src: 'icons/icon-256.png',
            sizes: '256x256',
            type: 'image/png'
          }
        ]
      }
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
        ]
      },

      custom: {
        preload: false,
        injectTo: 'head-prepend',
        families: [
          {
            name: 'Sharp Sans',
            src: 'node_modules/@dxos/assets/assets/fonts/sharp-sans/*.ttf'
          }
        ]
      }
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
      }
    }
  ]
});
