//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/PluginStorage': 'src/PluginStorage.ts',
    'ns/PluginLoader': 'src/PluginLoader.ts',
    'ns/Operations': 'src/Operations.ts',
    'ns/RegistryPaths': 'src/RegistryPaths.ts',
    'index': 'src/index.ts',
    'translations': 'src/translations.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'RegistryOperation': 'src/types/RegistryOperation.ts',
    'operations': 'src/operations/index.ts',
    'skills': 'src/skills/index.ts',
    'types': 'src/types.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
