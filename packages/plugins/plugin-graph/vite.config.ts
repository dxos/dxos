//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/GraphAction': 'src/GraphAction.ts',
    'ns/Hooks': 'src/Hooks.ts',
    'index': 'src/index.ts',
    'hooks': 'src/hooks/index.ts',
    'testing': 'src/testing.ts',
  },
  jsx: 'react',
  test: { node: true },
});
