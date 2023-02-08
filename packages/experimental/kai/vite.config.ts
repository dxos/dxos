//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { VitePluginFonts } from 'vite-plugin-fonts';

import { ThemePlugin } from '@dxos/react-components/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

// @ts-ignore
// NOTE: Vite requires uncompiled JS.
import { osThemeExtension, kaiThemeExtension } from './theme-extensions';

/**
 * https://vitejs.dev/config
 */
export default defineConfig({
  base: '', // Ensures relative path to assets.

  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: './key.pem',
            cert: './cert.pem'
          }
        : false

    // TODO(burdon): Disable HMR due to code size issues.
    // TODO(burdon): If disabled then tailwind doesn't update.
    // https://vitejs.dev/config/server-options.html#server-hmr
    // hmr: false
  },

  // TODO(burdon): Document why protos are necessary.
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/config',
      '@dxos/mosaic',
      '@dxos/plexus',
      '@dxos/protocols',
      '@dxos/keys',
      '@dxos/protocols/proto/dxos/client',
      '@dxos/protocols/proto/dxos/client/services',
      '@dxos/protocols/proto/dxos/config',
      '@dxos/protocols/proto/dxos/echo/feed',
      '@dxos/protocols/proto/dxos/echo/model/document',
      '@dxos/protocols/proto/dxos/echo/object',
      '@dxos/protocols/proto/dxos/halo/credentials',
      '@dxos/protocols/proto/dxos/halo/invitations',
      '@dxos/protocols/proto/dxos/halo/keys',
      '@dxos/protocols/proto/dxos/mesh/bridge',
      '@dxos/protocols/proto/dxos/rpc'
    ]
  },

  // TODO(burdon): Document.
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
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  },

  plugins: [
    // TODO(burdon): Document.
    ConfigPlugin({ env: ['DX_VAULT'] }),

    // Directories to scan for Tailwind classes.
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/chess-app/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/mosaic/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/plexus/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-composer/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-list/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs')
      ],
      extensions: [osThemeExtension, kaiThemeExtension]
    }),

    ReactPlugin(),

    // To reset, unregister service worker using devtools.
    VitePWA({
      selfDestroying: true,
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
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
    })
  ]
});
