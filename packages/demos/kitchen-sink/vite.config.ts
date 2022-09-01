//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    include: [
      '@dxos/async',
      '@dxos/client',
      '@dxos/client-testing',
      '@dxos/config',
      '@dxos/debug',
      '@dxos/echo-db',
      '@dxos/echo-protocol',
      '@dxos/echo-testing',
      '@dxos/object-model',
      '@dxos/react-client',
      '@dxos/react-client-testing',
      '@dxos/react-components',
      '@dxos/react-echo-graph',
      '@dxos/react-ipfs',
      '@dxos/react-toolkit'
    ]
  },
  build: {
    commonjsOptions: {
      // TODO(wittjosiah): Why must org scope be omitted for this to work?
      // https://github.com/vitejs/vite/issues/5668#issuecomment-968125763
      include: [
        /async/,
        /client/,
        /client-testing/,
        /config/,
        /debug/,
        /echo-db/,
        /echo-protocol/,
        /echo-testing/,
        /object-model/,
        /react-client/,
        /react-client-testing/,
        /react-components/,
        /react-echo-graph/,
        /react-ipfs/,
        /react-toolkit/,
        /node_modules/
      ]
    }
  },
  plugins: [react(), dxosPlugin()]
});
