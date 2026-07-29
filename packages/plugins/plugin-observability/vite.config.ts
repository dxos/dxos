//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ObservabilityPlugin': 'src/ObservabilityPlugin.ts',
    'ObservabilityPlugin.node': 'src/ObservabilityPlugin.node.ts',
    'ObservabilityPlugin.workerd': 'src/ObservabilityPlugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
