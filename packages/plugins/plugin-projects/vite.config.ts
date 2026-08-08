//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ProjectsPlugin': 'src/ProjectsPlugin.tsx',
    'ProjectsPlugin.workerd': 'src/ProjectsPlugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'ProjectCapabilities': 'src/types/ProjectCapabilities.ts',
    'ProjectMcpOperation': 'src/types/ProjectMcpOperation.ts',
    'ProjectOperation': 'src/types/ProjectOperation.ts',
    'ProjectsEvents': 'src/types/ProjectsEvents.ts',
  },
  jsx: 'react',
  // The story's first render waits on the demand-gated activation pass (the Idle wave plus every
  // plugin's start event), which costs several seconds before the play can begin, so the 15s
  // browser-mode default no longer clears it.
  test: { node: true, storybook: { timeout: 60_000 } },
});
