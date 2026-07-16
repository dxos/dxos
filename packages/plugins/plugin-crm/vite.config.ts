//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    CrmPlugin: 'src/CrmPlugin.ts',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    sources: 'src/sources/index.ts',
    testing: 'src/testing/index.ts',
    types: 'src/types/index.ts',
    translations: 'src/translations.ts',
    util: 'src/util/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true },
});
