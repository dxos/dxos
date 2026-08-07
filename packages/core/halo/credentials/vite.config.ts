//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Light subpath: credential type-guards without the barrel's seedphrase module, whose
    // bip39 wordlists are otherwise parse-reachable from boot code.
    assertions: 'src/credentials/assertions.ts',
  },
  test: { node: true },
});
