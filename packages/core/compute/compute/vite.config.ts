//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    StorageService: 'src/StorageService.ts',
    testing: 'src/testing/index.ts',
    index: 'src/index.ts',
  },
  test: { node: true },
});
