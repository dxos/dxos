//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    GraphPlugin: 'src/GraphPlugin.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
