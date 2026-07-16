//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'MapPlugin': 'src/MapPlugin.tsx',
    'MapPlugin.node': 'src/MapPlugin.node.ts',
    'MapPlugin.workerd': 'src/MapPlugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
  },
  jsx: 'solid',
  assetsAsFiles: true,
  test: { node: true },
});
