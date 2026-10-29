//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'extension': 'src/extension/index.ts',
    'spec-index': 'src/spec-index/index.ts',
    'cli': 'src/cli/index.ts',
  },
  test: { node: true },
});
