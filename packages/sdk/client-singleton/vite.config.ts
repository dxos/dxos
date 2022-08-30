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
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/rpc',
      '@dxos/rpc-worker-proxy'
    ]
  },
  build: {
    commonjsOptions: {
      include: [
        /client/,
        /config/,
        /protocols/,
        /react-async/,
        /rpc/,
        /rpc-worker-proxy/,
        /node_modules/
      ]
    }
  },
  plugins: [dxosPlugin()],
  worker: {
    plugins: [dxosPlugin()]
  },
  server: {
    port: 3967
  }
});
