//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'transport/tcp': 'src/transport/tcp/index.ts',
    'transport/tcp/tcp-transport.browser': 'src/transport/tcp/tcp-transport.browser.ts',
    'transport/tcp/tcp-transport': 'src/transport/tcp/tcp-transport.ts',
    testing: 'src/testing/index.ts',
    index: 'src/index.ts',
  },
  test: { node: true },
});
