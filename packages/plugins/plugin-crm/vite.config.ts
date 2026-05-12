//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    blueprints: 'src/blueprints/index.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    sources: 'src/sources/index.ts',
    testing: 'src/testing/index.ts',
    types: 'src/types/index.ts',
    util: 'src/util/index.ts',
    index: 'src/index.ts',
  },
  test: { node: { environment: 'happy-dom' } },
});
