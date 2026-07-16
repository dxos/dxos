//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'DevtoolsPlugin': 'src/DevtoolsPlugin.tsx',
    'DevtoolsPlugin.node': 'src/DevtoolsPlugin.node.ts',
    'DevtoolsPlugin.workerd': 'src/DevtoolsPlugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true, storybook: true },
});
