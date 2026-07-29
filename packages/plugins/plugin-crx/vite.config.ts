//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    CrxPlugin: 'src/CrxPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    util: 'src/util/index.ts',
    operations: 'src/operations/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
