//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'TablePlugin': 'src/TablePlugin.ts',
    'plugin': 'src/plugin.tsx',
    'plugin.node': 'src/plugin.node.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities.workerd': 'src/capabilities/workerd.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'TableEvents': 'src/types/TableEvents.ts',
    'TableOperation': 'src/types/TableOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
