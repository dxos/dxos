//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import VitePluginAppinfo from 'vite-plugin-build-info'
import { VitePWA } from 'vite-plugin-pwa';
import { VitePluginFonts } from 'vite-plugin-fonts';

import { ThemePlugin } from '@dxos/react-components/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

import packageJson from './package.json';

const env = (value?: string) => (value ? `"${value}"` : undefined);
const DX_RELEASE = process.env.NODE_ENV === 'production' ? `@dxos/tasks-app@${packageJson.version}` : undefined;

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
  },

  define: {
    'process.env.DEBUG': env(process.env.DEBUG),
    'process.env.DEMO': env(process.env.DEMO),
    'process.env.DX_ENVIRONMENT': env(process.env.DX_ENVIRONMENT),
    'process.env.DX_RELEASE': env(DX_RELEASE),
    'process.env.DX_VAULT': env(process.env.DX_VAULT),
    'process.env.LOG_BROWSER_PREFIX': env(process.env.LOG_BROWSER_PREFIX),
    'process.env.LOG_FILTER': env(process.env.LOG_FILTER)
  },

  // TODO(burdon): Document.
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
      '@dxos/protocols/proto/dxos/halo/credentials',
      '@dxos/protocols/proto/dxos/halo/invitations',
      '@dxos/protocols/proto/dxos/halo/keys',
      '@dxos/protocols/proto/dxos/mesh/bridge',
      '@dxos/protocols/proto/dxos/rpc'
    ]
  },

  // TODO(burdon): Document.
  build: {
    outDir: 'out/kai',
    sourcemap: true,
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-router-dom', 'react-dom']
        }
      }
    }
  },

  plugins: [
    // TODO(burdon): Document.
    ConfigPlugin(),

    // TODO(burdon): Document.
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/chess-app/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-composer/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-list/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs')
      ]
    }),

    // TODO(burdon): Document.
    ReactPlugin(),

    // TODO(burdon): Document.
    // To reset, unregister service worker using devtools.
    // VitePWA({
    //   workbox: {
    //     maximumFileSizeToCacheInBytes: 30000000
    //   },
    //   includeAssets: ['favicon.ico'],
    //   manifest: {
    //     name: 'DXOS Kai',
    //     short_name: 'Kai',
    //     description: 'DXOS Kai Demo',
    //     theme_color: '#ffffff',
    //     icons: [
    //       {
    //         src: 'icons/icon-32.png',
    //         sizes: '32x32',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'icons/icon-256.png',
    //         sizes: '256x256',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // }),

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

    // https://github.com/BWrong/vite-plugin-build-info
    VitePluginAppinfo({
      enableLog: true
    })
  ]
});
