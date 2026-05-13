//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    GraphPlugin: 'src/GraphPlugin.ts',
  },
  jsx: 'react',
  test: { node: true },
});
