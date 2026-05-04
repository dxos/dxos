// Copyright 2026 DXOS.org

import { defineConfig } from '../../../tsdown.base.config.ts';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/blueprints/index.ts',
    'src/operations/index.ts',
    'src/sources/index.ts',
    'src/testing/index.ts',
    'src/types/index.ts',
  ],
});
