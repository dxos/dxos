//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'RoutinePlugin': 'src/RoutinePlugin.ts',
    'plugin': 'src/plugin.tsx',
    'plugin.node': 'src/plugin.node.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities.workerd': 'src/capabilities/workerd.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'Routine': 'src/types/Routine.ts',
    'RoutineCapabilities': 'src/types/RoutineCapabilities.ts',
    'RoutineEvents': 'src/types/RoutineEvents.ts',
    'RoutineOperation': 'src/types/RoutineOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
