//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    extraction: 'src/extraction/index.ts',
    ExecutionGraph: 'src/util/execution-graph.ts',
  },
  test: { node: true },
});
