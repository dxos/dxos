//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    ChessSkill: 'src/skills/ChessSkill.ts',
    ChessOperationHandlerSet: 'src/operations/ChessOperationHandlerSet.ts',
    index: 'src/index.ts',
    ChessPlugin: 'src/ChessPlugin.ts',
    plugin: 'src/plugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    Chess: 'src/types/Chess.ts',
    ChessEvents: 'src/types/ChessEvents.ts',
    ChessOperation: 'src/types/ChessOperation.ts',
    ChessPositionIndex: 'src/types/ChessPositionIndex.ts',
    PlayerReview: 'src/types/PlayerReview.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
