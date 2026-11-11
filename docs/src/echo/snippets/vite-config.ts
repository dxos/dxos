//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';

// #region
export default defineConfig({
  build: { target: 'esnext' },
  optimizeDeps: {
    exclude: [
      '@dxos/wa-sqlite',
      '@automerge/automerge',
      '@automerge/automerge-subduction',
    ],
    include: ['chalk', 'lodash.defaultsdeep', '@dxos/node-std > deep-equal'],
  },
  plugins: [
    ConfigPlugin({ root: import.meta.dirname, env: ['MY_ENV_VAR'] }),
    wasm(),
  ],
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
});
// #endregion
