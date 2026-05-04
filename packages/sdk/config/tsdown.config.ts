// Copyright 2026 DXOS.org

import { defineConfig } from '../../../tsdown.base.config.ts';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/loaders/index.ts',
    'src/loaders/browser.ts',
    'src/savers/index.ts',
    'src/savers/browser.ts',
    'src/plugin/index.ts',
    'src/plugin/browser.ts',
  ],
});
