//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    StorybookPlugin: 'src/StorybookPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    core: 'src/core.ts',
    harness: 'src/harness.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
