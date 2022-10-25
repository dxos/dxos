//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
// import { VitePWA } from 'vite-plugin-pwa';

import { themePlugin } from '@dxos/react-ui/plugin';
import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true,
    port: 3967
  },
  define: {
    'process.env.DX_ENVIRONMENT': process.env.DX_ENVIRONMENT,
    'process.env.SENTRY_DSN': process.env.SENTRY_DSN,
    'process.env.SEGMENT_API_KEY': process.env.SEGMENT_API_KEY
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/async',
      '@dxos/client',
      '@dxos/client-services',
      '@dxos/keys',
      '@dxos/log',
      '@dxos/composer',
      '@dxos/config',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-client',
      '@dxos/react-uikit',
      '@dxos/rpc',
      '@dxos/network-manager',
      '@dxos/rpc-tunnel',
      '@dxos/text-model',
      '@dxos/util'
    ],
    esbuildOptions: {
      // TODO(wittjosiah): Remove.
      plugins: [
        {
          name: 'yjs',
          setup: ({ onResolve }) => {
            onResolve({ filter: /yjs/ }, () => {
              return { path: require.resolve('yjs').replace('.cjs', '.mjs') }
            })
          }
        }
      ]
    }
  },
  build: {
    // TODO(wittjosiah): Remove.
    minify: false,
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        headless: resolve(__dirname, 'headless.html')
      }
    }
  },
  plugins: [
    dxosPlugin(),
    themePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-uikit/dist/**/*.js')
      ]
    }),
    react()
    // TODO(wittjosiah): Re-enable.
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   // TODO(wittjosiah): Bundle size is massive.
    //   workbox: {
    //     maximumFileSizeToCacheInBytes: 30000000
    //   },
    //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
    //   manifest: {
    //     name: 'HALO',
    //     short_name: 'HALO',
    //     description: 'DXOS HALO Application',
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
    // })
  ],
  worker: {
    format: 'es',
    plugins: [dxosPlugin()]
  }
});
