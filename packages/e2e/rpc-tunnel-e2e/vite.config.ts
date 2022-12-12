//
// Copyright 2022 DXOS.org
//

import { defineConfig } from 'vite';

import { ConfigPlugin } from '@dxos/config/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/async',
      '@dxos/codec-protobuf',
      '@dxos/log',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-components',
      '@dxos/rpc',
      '@dxos/rpc-tunnel'
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
  plugins: [ConfigPlugin()],
  worker: {
    plugins: [ConfigPlugin()]
  }
});
