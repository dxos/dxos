//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    ObservabilityPlugin: 'src/ObservabilityPlugin.ts',
    'ObservabilityPlugin.node': 'src/ObservabilityPlugin.node.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
