//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ProjectsPlugin: 'src/ProjectsPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    types: 'src/types/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    ProjectCapabilities: 'src/types/ProjectCapabilities.ts',
    ProjectOperation: 'src/types/ProjectOperation.ts',
    ProjectsEvents: 'src/types/ProjectsEvents.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
