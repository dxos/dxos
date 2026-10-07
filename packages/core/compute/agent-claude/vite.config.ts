//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Separate entry so a browser consumer can reach the wire contract and fetch client without
    // pulling in the host, which spawns processes and reads the filesystem.
    client: 'src/client/index.ts',
    producer: 'src/producer/index.ts',
  },
  test: { node: true },
});
