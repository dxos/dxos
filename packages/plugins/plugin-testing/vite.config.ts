//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    StorybookPlugin: 'src/StorybookPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    types: 'src/types/index.ts',
    harness: 'src/harness.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
});
