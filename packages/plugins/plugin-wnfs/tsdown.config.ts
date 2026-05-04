// Copyright 2026 DXOS.org

import { defineConfig } from '../../../tsdown.base.config.ts';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/helpers/index.ts',
    'src/translations.ts',
    'src/types/index.ts',
    'src/operations/index.ts',
  ],
  platform: ['browser'],
});
