//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/BlueskyEvents': 'src/BlueskyEvents.ts',
    'index': 'src/index.ts',
    'operations': 'src/operations/index.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types.ts',
  },
  jsx: 'react',
  test: { node: true },
});
