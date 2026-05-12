//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    blueprints: 'src/blueprints/index.ts',
    operations: 'src/operations/index.ts',
    sources: 'src/sources/index.ts',
    testing: 'src/testing/index.ts',
    types: 'src/types/index.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    util: 'src/util/index.ts',
  },
  test: { node: { environment: 'happy-dom' } },
});
