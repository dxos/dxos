//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    LabelerPlugin: 'src/LabelerPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    types: 'src/types/index.ts',
    LabelerOperation: 'src/types/LabelerOperation.ts',
  },
  test: { node: true },
});
