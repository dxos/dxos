//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'fact-store': 'src/store/fact-store.ts',
    'types': 'src/types/index.ts',
    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
