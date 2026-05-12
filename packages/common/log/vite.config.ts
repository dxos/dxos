//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'platform/browser': 'src/platform/browser/index.ts',
    'platform/node': 'src/platform/node/index.ts',
    'processors/console-stub': 'src/processors/console-stub.ts',
    'processors/console-processor': 'src/processors/console-processor.ts',
    index: 'src/index.ts',
  },
  test: { node: { environment: 'happy-dom' } },
});
