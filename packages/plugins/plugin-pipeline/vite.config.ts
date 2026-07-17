//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'PipelinePlugin': 'src/PipelinePlugin.tsx',
    'PipelinePlugin.node': 'src/PipelinePlugin.node.ts',
    'PipelinePlugin.workerd': 'src/PipelinePlugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'jsdom' }, storybook: true },
});
