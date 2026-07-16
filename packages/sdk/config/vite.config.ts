//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'plugin/esbuild-plugin': 'src/plugin/esbuild-plugin.ts',
    'plugin/rollup-plugin': 'src/plugin/rollup-plugin.ts',
    'plugin/vite-plugin': 'src/plugin/vite-plugin.ts',
    'index': 'src/index.ts',
    'loaders/browser': 'src/loaders/browser.ts',
    'loaders': 'src/loaders/index.ts',
    'savers/browser': 'src/savers/browser.ts',
    'savers': 'src/savers/index.ts',
    'plugin/browser': 'src/plugin/browser.ts',
    'plugin': 'src/plugin/index.ts',
  },
  test: { node: true },
});
