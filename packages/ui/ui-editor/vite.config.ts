//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    headless: 'src/headless.ts',
    types: 'src/types/index.ts',
  },
  test: { node: { environment: 'happy-dom' } },
});
