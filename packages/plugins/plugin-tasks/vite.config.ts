//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'TasksPlugin': 'src/TasksPlugin.tsx',
    'TasksPlugin.workerd': 'src/TasksPlugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'Journal': 'src/types/Journal.ts',
    'OutlineOperation': 'src/types/OutlineOperation.ts',
    'TaskOperation': 'src/types/TaskOperation.ts',
    'TasksEvents': 'src/types/TasksEvents.ts',
    'TasksUtil': 'src/types/TasksUtil.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
