//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // For a page that checks storage before it has services, without the rest of the package's graph.
    storage: 'src/internal/storage/storage.ts',
    testing: 'src/testing/index.ts',
  },
  test: { node: true },
});
