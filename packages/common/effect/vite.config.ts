//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    testing: 'src/testing.ts',
    index: 'src/index.ts',
  },
  test: { node: true },
});
