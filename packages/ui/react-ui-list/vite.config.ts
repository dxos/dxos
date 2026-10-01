//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    next: 'src/next/index.ts',
    util: 'src/util/index.ts',
  },
  jsx: 'react',
});
