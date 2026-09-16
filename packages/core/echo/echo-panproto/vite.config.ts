//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.ts',
    wasm: 'src/wasm.ts',
  },
  test: { node: true },
});
