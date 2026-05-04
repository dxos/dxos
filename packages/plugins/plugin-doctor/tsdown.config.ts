// Copyright 2026 DXOS.org

import { defineConfig } from '@dxos/dx-tsdown/config';

export default defineConfig({
  entry: ['src/index.ts', 'src/blueprints/index.ts', 'src/meta.ts', 'src/operations/index.ts', 'src/translations.ts'],
});
