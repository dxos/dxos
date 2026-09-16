//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    AtomEx: 'src/AtomEx.ts',
    index: 'src/index.ts',
    testing: 'src/testing.ts',
  },
  test: { node: true },
});
