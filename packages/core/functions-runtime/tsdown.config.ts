// Copyright 2026 DXOS.org

import { defineConfig } from '@dxos/dx-tsdown/config';

export default defineConfig({
  entry: ['src/bundler/index.ts', 'src/edge/index.ts', 'src/index.ts', 'src/native/index.ts', 'src/testing/index.ts'],
  platform: ['neutral'],
});
