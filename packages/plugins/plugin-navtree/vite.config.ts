//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    NavTreePlugin: 'src/NavTreePlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    NavTreeNode: 'src/types/NavTreeNode.ts',
    NavTreeCapabilities: 'src/types/NavTreeCapabilities.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
