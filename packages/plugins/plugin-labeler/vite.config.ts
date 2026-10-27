//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    operations: 'src/operations/index.ts',
    types: 'src/types/index.ts',
    LabelerOperation: 'src/types/LabelerOperation.ts',
  },
  test: { node: true },
});
