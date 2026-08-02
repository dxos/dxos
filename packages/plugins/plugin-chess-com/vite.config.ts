//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ChessComPlugin': 'src/ChessComPlugin.tsx',
    'ChessComPlugin.node': 'src/ChessComPlugin.node.ts',
    'ChessComPlugin.workerd': 'src/ChessComPlugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'ChessComAccount': 'src/types/ChessComAccount.ts',
    'ChessComEvents': 'src/types/ChessComEvents.ts',
    'ChessComOperation': 'src/types/ChessComOperation.ts',
  },
  jsx: 'react',
  test: { node: true },
});
