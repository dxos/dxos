//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    MapSkill: 'src/skills/MapSkill.ts',
    MapOperationHandlerSet: 'src/operations/MapOperationHandlerSet.ts',
    index: 'src/index.ts',
    MapPlugin: 'src/MapPlugin.ts',
    plugin: 'src/plugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    MapRole: 'src/types/MapRole.ts',
    Map: 'src/types/Map.ts',
    MapAction: 'src/types/MapAction.ts',
    MapCapabilities: 'src/types/MapCapabilities.ts',
    MapEvents: 'src/types/MapEvents.ts',
    MapOperation: 'src/types/MapOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
