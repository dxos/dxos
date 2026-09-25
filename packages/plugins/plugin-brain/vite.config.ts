//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    BrainSkill: 'src/skills/BrainSkill.ts',
    BrainOperationHandlerSet: 'src/operations/BrainOperationHandlerSet.ts',
    index: 'src/index.ts',
    BrainPlugin: 'src/BrainPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    containers: 'src/containers/index.ts',
    BrainCapabilities: 'src/types/BrainCapabilities.ts',
    BrainEvents: 'src/types/BrainEvents.ts',
    BrainOperation: 'src/types/BrainOperation.ts',
    BrainSettings: 'src/types/BrainSettings.ts',
    BrainSurface: 'src/types/BrainSurface.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
