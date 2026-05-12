//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    blueprints: 'src/blueprints/index.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    MapPlugin: 'src/MapPlugin.tsx',
    'MapPlugin.node': 'src/MapPlugin.node.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
