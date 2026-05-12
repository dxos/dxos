//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    types: 'src/types/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
