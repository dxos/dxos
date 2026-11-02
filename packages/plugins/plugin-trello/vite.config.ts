//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    TrelloEvents: 'src/types/TrelloEvents.ts',
    TrelloOperation: 'src/types/TrelloOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
