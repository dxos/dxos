//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    GraphBuilder: 'src/GraphBuilder.ts',
    GraphEdge: 'src/GraphEdge.ts',
    GraphModel: 'src/GraphModel.ts',
    GraphNode: 'src/GraphNode.ts',
    GraphNodeMatcher: 'src/GraphNodeMatcher.ts',
  },
  test: { node: true },
});
