import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [topLevelAwait(), wasm()],

  worker: {
    format: 'es',
    plugins: [topLevelAwait(), wasm()],
  },
});