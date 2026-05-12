//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    blueprints: 'src/blueprints/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    testing: 'src/testing.ts',
    operations: 'src/operations/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
