//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'TablePlugin': 'src/TablePlugin.tsx',
    'TablePlugin.node': 'src/TablePlugin.node.ts',
    'TablePlugin.workerd': 'src/TablePlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
