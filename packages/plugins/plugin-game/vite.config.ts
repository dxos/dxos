//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'GamePlugin': 'src/GamePlugin.tsx',
    'GamePlugin.node': 'src/GamePlugin.node.tsx',
    'GamePlugin.workerd': 'src/GamePlugin.workerd.tsx',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'util': 'src/util/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true },
});
