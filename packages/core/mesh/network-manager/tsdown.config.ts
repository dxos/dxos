// Copyright 2026 DXOS.org

import { defineConfig } from '../../../../tsdown.base.config.ts';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/testing/index.ts',
    'src/transport/tcp/index.ts',
    'src/transport/tcp/tcp-transport.ts',
    'src/transport/tcp/tcp-transport.browser.ts',
  ],
  injectGlobals: true,
});
