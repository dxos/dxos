// Copyright 2026 DXOS.org

import { defineConfig } from '@dxos/dx-tsdown/config';

export default defineConfig({
  entry: ['src/index.ts', 'src/testing/index.ts', 'src/playwright/index.ts', 'src/translations.ts'],
});
