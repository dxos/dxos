//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    AgentService: 'src/AgentService.ts',
    StorageService: 'src/StorageService.ts',
    testing: 'src/testing/index.ts',
  },
  test: { node: true },
});
