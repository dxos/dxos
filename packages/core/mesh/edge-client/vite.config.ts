//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'cors-proxy': 'src/cors-proxy.ts',
    'edge-http-client': 'src/edge-http-client.ts',
    'edge-ws-muxer': 'src/edge-ws-muxer.ts',
    'index': 'src/index.ts',
    'process': 'src/edge-process-http-client.ts',
    'service': 'src/service/index.ts',
    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
