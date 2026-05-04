// Copyright 2026 DXOS.org

import { defineConfig } from '../../../tsdown.base.config.ts';

export default defineConfig({
  entry: ['src/index.ts', 'src/browser/index.ts', 'src/node/index.ts'],
  injectGlobals: true,
  bundlePackages: [
    'random-access-idb',
    'random-access-storage',
    'inherits',
    'next-tick',
    'once',
    'wrappy',
    'buffer-from',
    'buffer-alloc',
    'buffer-fill',
    'buffer-alloc-unsafe',
  ],
});
