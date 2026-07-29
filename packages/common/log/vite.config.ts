//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'platform/browser': 'src/platform/browser/index.ts',
    'platform/node': 'src/platform/node/index.ts',
    'processors/console-stub': 'src/processors/console-stub.ts',
    'processors/console-processor': 'src/processors/console-processor.ts',
    'processors/file-processor': 'src/processors/file-processor.ts',
  },
  test: { node: true },
});
