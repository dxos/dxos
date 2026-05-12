//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    operations: 'src/operations/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
