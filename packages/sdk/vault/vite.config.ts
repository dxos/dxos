//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

import { ThemePlugin } from '@dxos/react-components/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 3967,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: './key.pem',
            cert: './cert.pem'
          }
        : false
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        vault: resolve(__dirname, 'vault.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-router-dom', 'react-dom']
        }
      }
    }
  },
  plugins: [
    ConfigPlugin({
      // TODO(wittjosiah): This generates config not found errors when not served by `startVault`.
      //   This is currently the case inside this monorepo in an attempt to avoid having the vault
      //   bundle target be on the core build path.
      dynamic: true,
      env: [
        'DX_ENVIRONMENT',
        'DX_IPDATA_API_KEY',
        'DX_SENTRY_DESTINATION',
        'DX_TELEMETRY_API_KEY'
      ]
    }),
    ThemePlugin({
      content: [
        resolve(__dirname, './*.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs')
      ]
    }),
    ReactPlugin(),
    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // TODO(wittjosiah): Get github to recognize sentry token.
    // ...(process.env.NODE_ENV === 'production'
    //   ? [
    //       sentryVitePlugin({
    //         org: 'dxos',
    //         project: 'vault',
    //         include: './dist/bundle',
    //         authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN
    //       })
    //     ]
    //   : [])
  ],
  worker: {
    format: 'es',
    plugins: [
      ConfigPlugin({
        env: [
          'DX_ENVIRONMENT',
          'DX_IPDATA_API_KEY',
          'DX_SENTRY_DESTINATION',
          'DX_TELEMETRY_API_KEY'
        ]
      })
    ]
  }
});
