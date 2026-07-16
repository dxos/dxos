//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    BrainPlugin: 'src/BrainPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    types: 'src/types/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    containers: 'src/containers/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true },
});
