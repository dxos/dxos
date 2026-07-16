//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    sandbox: 'src/sandbox/index.ts',
  },
  assetsAsFiles: true,
  test: { node: true },
});
