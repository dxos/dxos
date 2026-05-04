// Copyright 2026 DXOS.org

import { defineConfig } from '../../../tsdown.base.config.ts';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/platform/browser/index.ts',
    'src/platform/node/index.ts',
    'src/processors/console-stub.ts',
    'src/processors/console-processor.ts',
  ],
});
