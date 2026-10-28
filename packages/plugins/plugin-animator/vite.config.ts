//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    AnimatorPlugin: 'src/AnimatorPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    effects: 'src/effects/index.ts',
    meta: 'src/meta.ts',
    model: 'src/model/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    Animation: 'src/types/Animation.ts',
    AnimatorCapabilities: 'src/types/AnimatorCapabilities.ts',
    AnimatorEvents: 'src/types/AnimatorEvents.ts',
    AnimatorOperation: 'src/types/AnimatorOperation.ts',
    AnimatorOperationHandlerSet: 'src/operations/AnimatorOperationHandlerSet.ts',
    testing: 'src/testing/index.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
