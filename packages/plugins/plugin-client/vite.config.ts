//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    capabilities: 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    ClientPlugin: 'src/ClientPlugin.ts',
    'ClientPlugin.node': 'src/ClientPlugin.node.ts',
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    plugin: 'src/plugin.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
