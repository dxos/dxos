//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    'SamplePlugin.node': 'src/SamplePlugin.node.ts',
    SamplePlugin: 'src/SamplePlugin.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
