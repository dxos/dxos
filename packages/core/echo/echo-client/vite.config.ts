//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
    internal: 'src/internal/index.ts',
  },
  test: { node: true },
});
