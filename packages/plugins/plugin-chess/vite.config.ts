//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ChessPlugin': 'src/ChessPlugin.tsx',
    'ChessPlugin.node': 'src/ChessPlugin.node.ts',
    'ChessPlugin.workerd': 'src/ChessPlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'Chess': 'src/types/Chess.ts',
    'ChessEvents': 'src/types/ChessEvents.ts',
    'ChessOperation': 'src/types/ChessOperation.ts',
    'ChessPositionIndex': 'src/types/ChessPositionIndex.ts',
    'PlayerReview': 'src/types/PlayerReview.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
