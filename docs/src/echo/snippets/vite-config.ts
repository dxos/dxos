//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';

// #region
export default defineConfig({
  plugins: [ConfigPlugin({ root: import.meta.dirname, env: ['MY_ENV_VAR'] }), wasm()],
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
});
// #endregion
