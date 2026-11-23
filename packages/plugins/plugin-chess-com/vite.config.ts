//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    ChessComAccount: 'src/types/ChessComAccount.ts',
    ChessComEvents: 'src/types/ChessComEvents.ts',
    ChessComOperation: 'src/types/ChessComOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
