//
// Copyright 2022 DXOS.org
//

import { defineConfig } from 'vite';

import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    include: [
      '@dxos/codec-protobuf',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-components',
      '@dxos/rpc',
      '@dxos/rpc-worker-proxy'
    ]
  },
  build: {
    commonjsOptions: {
      include: [
        /codec-protobuf/,
        /protocols/,
        /react-async/,
        /react-components/,
        /rpc/,
        /rpc-worker-proxy/,
        /node_modules/
      ]
    }
  },
  plugins: [dxosPlugin()],
  worker: {
    plugins: [dxosPlugin()]
  }
});
