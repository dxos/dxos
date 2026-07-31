//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'cors-proxy': 'src/cors-proxy.ts',
    'edge-ws-muxer': 'src/edge-ws-muxer.ts',
    'index': 'src/index.ts',
    'service': 'src/service/index.ts',
    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
