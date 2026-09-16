//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    browser: 'src/browser/index.ts',
    node: 'src/node/index.ts',
  },
  // `random-access-idb` ships CJS only.
  bundle: ['random-access-idb'],
  injectGlobals: true,
  test: { node: true },
});
