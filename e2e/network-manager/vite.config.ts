//
// Copyright 2022 DXOS.org
//

import { defineConfig } from 'vite';

import { NodeModulesPlugin } from '@dxos/esbuild-plugins';
import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/async',
      '@dxos/codec-protobuf',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-components',
      '@dxos/rpc',
      '@dxos/rpc-tunnel',
      "@dxos/crypto",
      "@dxos/mesh-protocol",
      "@dxos/network-manager",
      "@dxos/messaging",
      "@dxos/signal",
    ],
    esbuildOptions: {
      plugins: [
        NodeModulesPlugin()
      ]
    }
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
