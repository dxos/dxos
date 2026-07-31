//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    bundler: 'src/bundler/index.ts',
    edge: 'src/edge/index.ts',
    index: 'src/index.ts',
    native: 'src/native/index.ts',
    testing: 'src/testing/index.ts',
  },
  assetsAsFiles: true,
  test: { node: true },
});
