//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // One entry per subpath the package exports, or the built package cannot resolve them.
    McpServer: 'src/McpServer.ts',
  },
  test: { node: true },
});
