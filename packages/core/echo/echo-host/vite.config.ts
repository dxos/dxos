//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'filter': 'src/filter/index.ts',
    'index': 'src/index.ts',
    'query/planner': 'src/query/planner.ts',
    'testing': 'src/testing/index.ts',
    'version-history': 'src/versions/version-history.ts',
  },
  test: { node: true },
});
