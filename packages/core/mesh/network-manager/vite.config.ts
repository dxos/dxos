//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'testing': 'src/testing/index.ts',
    'transport/tcp/index': 'src/transport/tcp/index.ts',
    'transport/tcp/tcp-transport': 'src/transport/tcp/tcp-transport.ts',
    'transport/tcp/tcp-transport.browser': 'src/transport/tcp/tcp-transport.browser.ts',
  },
  test: { node: true },
});
