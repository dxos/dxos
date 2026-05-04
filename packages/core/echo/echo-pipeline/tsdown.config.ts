// Copyright 2026 DXOS.org

import { defineConfig } from '@dxos/dx-tsdown/config';

export default defineConfig({
  entry: ['src/filter/index.ts', 'src/index.ts', 'src/testing/index.ts'],
  platform: ['neutral'],
  injectGlobals: true,
});
