//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    diagnostics: 'src/diagnostics/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    blueprints: 'src/blueprints/index.ts',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    DoctorPlugin: 'src/DoctorPlugin.tsx',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
