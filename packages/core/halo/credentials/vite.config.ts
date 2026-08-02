//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    seedphrase: 'src/seedphrase.ts',
  },
  test: { node: true },
});
