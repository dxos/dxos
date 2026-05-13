//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    native: 'src/native/index.ts',
    bundler: 'src/bundler/index.ts',
    edge: 'src/edge/index.ts',
    testing: 'src/testing/index.ts',
  },
  assetsAsFiles: true,
  test: { node: true },
});
