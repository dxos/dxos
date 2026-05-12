//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'edge-ws-muxer': 'src/edge-ws-muxer.ts',
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
  },
  test: { node: true },
});
