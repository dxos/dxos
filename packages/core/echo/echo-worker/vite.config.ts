//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // The Durable Object, built apart from the client so a browser bundle never reaches it.
    worker: 'src/worker/index.ts',
  },
});
