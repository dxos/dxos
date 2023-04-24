//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { ConfigPlugin } from '@dxos/config/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
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
  build: {
    sourcemap: true
  },
  plugins: [
    ConfigPlugin({ env: ['DX_VAULT'] }),
    ReactPlugin(),
    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    ...(process.env.NODE_ENV === 'production' && process.env.CI === 'true'
      ? [
          sentryVitePlugin({
            org: 'dxos',
            project: 'todomvc',
            include: './out/todomvc',
            authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN
          })
        ]
      : [])
  ]
});
