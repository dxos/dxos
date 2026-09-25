//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
    Memory: 'src/types/Memory.ts',
    AgentOperation: 'src/operations/definitions.ts',
  },
  jsx: 'react',
  test: { node: true },
});
