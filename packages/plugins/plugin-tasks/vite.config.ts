//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    TasksOperationHandlerSet: 'src/operations/TasksOperationHandlerSet.ts',
    index: 'src/index.ts',
    TasksPlugin: 'src/TasksPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    Journal: 'src/types/Journal.ts',
    OutlineOperation: 'src/types/OutlineOperation.ts',
    TaskOperation: 'src/types/TaskOperation.ts',
    TasksCapabilities: 'src/types/TasksCapabilities.ts',
    TasksEvents: 'src/types/TasksEvents.ts',
    TasksUtil: 'src/types/TasksUtil.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
