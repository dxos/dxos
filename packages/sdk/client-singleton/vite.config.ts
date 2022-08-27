//
// Copyright 2022 DXOS.org
//

import { defineConfig } from 'vite';

import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'node:path': 'path-browserify/'
    }
  },
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    include: [
      '@dxos/client',
      '@dxos/client/client',
      '@dxos/config',
      '@dxos/react-async',
      '@dxos/rpc',
      '@dxos/rpc-worker-proxy'
    ]
  },
  build: {
    commonjsOptions: {
      // TODO(wittjosiah): Prod build not working, use package.json exports?
      include: [
        /client/,
        /config/,
        /react-async/,
        /rpc/,
        /rpc-worker-proxy/,
        /node_modules/
      ]
    }
  },
  plugins: [dxosPlugin()]
});
