//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing/index.ts',
    blueprints: 'src/blueprints/index.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    CrmPlugin: 'src/CrmPlugin.ts',
    sources: 'src/sources/index.ts',
    types: 'src/types/index.ts',
    util: 'src/util/index.ts',
  },
  test: { node: true },
});
