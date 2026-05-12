//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    types: 'src/types/index.ts',
    index: 'src/index.ts',
  },
  test: { node: true },
});
