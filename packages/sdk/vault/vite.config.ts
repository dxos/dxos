//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

import { ThemePlugin } from '@dxos/aurora-theme/plugin';
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
            cert: './cert.pem',
          }
        : false,
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
      input: {
        vault: resolve(__dirname, 'vault.html'),
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-router-dom', 'react-dom'],
        },
      },
    },
  },
  plugins: [
    ConfigPlugin({
      // TODO(wittjosiah): This generates config not found errors when not served by `startVault`.
      //   This is currently the case inside this monorepo in an attempt to avoid having the vault
      //   bundle target be on the core build path.
      dynamic: true,
      env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY'],
    }),
    ThemePlugin({
      root: __dirname,
      content: [resolve(__dirname, './*.html'), resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}')],
    }),
    // https://github.com/preactjs/signals/issues/269
ReactPlugin({ jsxRuntime: 'classic' }),
    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    sentryVitePlugin({
      org: 'dxos',
      project: 'vault',
      sourcemaps: {
        assets: './packages/sdk/vault/dist/bundle/**',
      },
      authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
      dryRun: process.env.DX_ENVIRONMENT !== 'production',
    }),
  ],
  worker: {
    format: 'es',
    plugins: [
      ConfigPlugin({
        env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY'],
      }),
    ],
  },
});
