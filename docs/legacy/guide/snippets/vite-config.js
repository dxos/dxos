//
// Copyright 2024 DXOS.org
//

import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [topLevelAwait(), wasm()],

  worker: {
    format: 'es',
    plugins: [topLevelAwait(), wasm()],
  },
});
