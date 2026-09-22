//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'filter': 'src/filter/index.ts',
    'index': 'src/index.ts',
    'query/planner': 'src/query/planner.ts',
    'subduction-migrations': 'src/automerge/subduction-migrations/index.ts',
    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
