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
  // The article story walks five sections, each with its own 10s bound, so the test timeout has to
  // clear their total or the story can never pass regardless of how fast the run actually is.
  test: { node: true, storybook: { timeout: 60_000 } },
});
