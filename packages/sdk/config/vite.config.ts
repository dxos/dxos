//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'loaders/index': 'src/loaders/index.ts',
    'loaders/browser': 'src/loaders/browser.ts',
    'savers/index': 'src/savers/index.ts',
    'savers/browser': 'src/savers/browser.ts',
    'plugin/index': 'src/plugin/index.ts',
    'plugin/browser': 'src/plugin/browser.ts',
    'plugin/esbuild-plugin': 'src/plugin/esbuild-plugin.ts',
    'plugin/rollup-plugin': 'src/plugin/rollup-plugin.ts',
    'plugin/vite-plugin': 'src/plugin/vite-plugin.ts',
  },
  test: { node: true },
});
