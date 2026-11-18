//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    LocalRdfStore: 'src/LocalRdfStore.ts',
    MemorySqlite: 'src/MemorySqlite.ts',
    RdfMemory: 'src/RdfMemory.ts',
  },
  test: { node: true },
});
