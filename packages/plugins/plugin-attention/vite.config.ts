//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    types: 'src/types/index.ts',
    AttentionPlugin: 'src/AttentionPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
