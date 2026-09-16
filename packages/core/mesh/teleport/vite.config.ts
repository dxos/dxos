//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
  },
  // `varint` ships CJS only, and reads `Buffer` as a free global.
  bundle: ['varint'],
  injectGlobals: true,
  test: { node: true },
});
