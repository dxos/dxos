//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    meta: 'src/meta.ts',
    components: 'src/components/index.ts',
    hooks: 'src/hooks/index.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
