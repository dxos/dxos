//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    harness: 'src/harness.ts',
    plugin: 'src/plugin.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    StorybookPlugin: 'src/StorybookPlugin.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
});
