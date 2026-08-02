//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'MapPlugin': 'src/MapPlugin.tsx',
    'MapPlugin.node': 'src/MapPlugin.node.ts',
    'MapPlugin.workerd': 'src/MapPlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'Map': 'src/types/Map.ts',
    'MapAction': 'src/types/MapAction.ts',
    'MapCapabilities': 'src/types/MapCapabilities.ts',
    'MapEvents': 'src/types/MapEvents.ts',
    'MapOperation': 'src/types/MapOperation.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
