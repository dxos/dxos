//
// Copyright 2022 DXOS.org
//

import { defineConfig } from 'vite';

import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    port: 3967
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/async',
      '@dxos/client',
      '@dxos/codec-protobuf',
      '@dxos/config',
      '@dxos/log',
      '@dxos/protocols',
      '@dxos/rpc',
      '@dxos/rpc-tunnel',
      '@dxos/network-manager'
    ]
  },
  build: {
    commonjsOptions: {
      include: [
        /packages/,
        /node_modules/
      ]
    }
  },
  plugins: [dxosPlugin()],
  worker: {
    plugins: [dxosPlugin()]
  }
});
