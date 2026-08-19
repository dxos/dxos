//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Own entry so a wire-only host importing the root barrel never bundles the operation runtime.
    DxMcpService: 'src/DxMcpService.ts',
  },
  test: { node: true },
});
