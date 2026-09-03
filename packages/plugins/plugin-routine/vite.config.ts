//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    RoutinePlugin: 'src/RoutinePlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
    Routine: 'src/types/Routine.ts',
    RoutineCapabilities: 'src/types/RoutineCapabilities.ts',
    RoutineEvents: 'src/types/RoutineEvents.ts',
    RoutineOperation: 'src/types/RoutineOperation.ts',
    types: 'src/types/index.ts',
    util: 'src/util/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
