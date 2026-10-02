//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/Hooks': 'src/Hooks.ts',
    'ns/ForceGraph': 'src/ForceGraph.ts',
    'ForceGraph': 'src/components/Graph/index.ts',
    'index': 'src/index.ts',
    'ExplorerPlugin': 'src/ExplorerPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'testing': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'ExplorerAction': 'src/types/ExplorerAction.ts',
    'ExplorerEvents': 'src/types/ExplorerEvents.ts',
    'Graph': 'src/types/Graph.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
