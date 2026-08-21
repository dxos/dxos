//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'CodeProjectSkill': 'src/skills/CodeProjectSkill.ts',
    'ProjectOperationHandlerSet': 'src/operations/ProjectOperationHandlerSet.ts',
    'index': 'src/index.ts',
    'ProjectsPlugin': 'src/ProjectsPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities.workerd': 'src/capabilities/gen/workerd.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'translations': 'src/translations.ts',
    'ProjectCapabilities': 'src/types/ProjectCapabilities.ts',
    'ProjectMcpOperation': 'src/types/ProjectMcpOperation.ts',
    'ProjectOperation': 'src/types/ProjectOperation.ts',
    'ProjectsEvents': 'src/types/ProjectsEvents.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  // The first story in a file pays the whole lazy module-load bill — tens of seconds, against a
  // couple for each story after it — which the 15s browser-mode default cannot cover.
  test: { node: true, storybook: { timeout: 60_000 } },
});
