//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'callback': 'src/callback/index.ts',
    'oauth': 'src/oauth/index.ts',
    'testing': 'src/testing/index.ts',
    'util/platform.browser': 'src/util/platform.browser.ts',
    'util/platform.node': 'src/util/platform.node.ts',
  },
  test: { node: true },
});
