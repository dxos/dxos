//
// Copyright 2024 DXOS.org
//

import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';

// NODE_OPTIONS="--trace-warnings" p test

// https://vitejs.dev/config
export default defineConfig({
  test: {
    global: true,
    environment: 'happy-dom',
    include: ['**/*.spec.tsx'],
  },
  plugins: [topLevelAwait(), wasm()],
  // worker: {
  //   plugins: () => [topLevelAwait(), wasm()],
  // },
});
