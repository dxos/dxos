//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

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
  plugins: [wasm()],
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
});
// #endregion
