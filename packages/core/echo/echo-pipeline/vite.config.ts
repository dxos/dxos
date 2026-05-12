//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    testing: 'src/testing/index.ts',
    filter: 'src/filter/index.ts',
    index: 'src/index.ts',
  },
  test: { node: { environment: 'happy-dom' } },
});
