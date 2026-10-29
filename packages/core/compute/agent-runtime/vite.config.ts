//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'mcp-server-types': 'src/mcp-server-types.ts',
    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
