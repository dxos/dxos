//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    ChessSkill: 'src/skills/ChessSkill.ts',
    ChessOperationHandlerSet: 'src/operations/ChessOperationHandlerSet.ts',
    index: 'src/index.ts',
    skills: 'src/skills/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    operations: 'src/operations/index.ts',
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
