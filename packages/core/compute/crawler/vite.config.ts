//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    AgentRegistry: 'src/AgentRegistry.ts',
    Crawler: 'src/Crawler.ts',
    CrawlState: 'src/CrawlState.ts',
    StateStore: 'src/StateStore.ts',
    Type: 'src/types.ts',
    testing: 'src/testing/index.ts',
  },
  test: { node: true },
});
