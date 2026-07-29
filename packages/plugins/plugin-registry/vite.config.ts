//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'RegistryPlugin': 'src/RegistryPlugin.tsx',
    'RegistryPlugin.node': 'src/RegistryPlugin.node.ts',
    'RegistryPlugin.workerd': 'src/RegistryPlugin.workerd.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'types': 'src/types.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
