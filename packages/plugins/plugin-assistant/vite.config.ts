//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'AssistantPlugin': 'src/AssistantPlugin.ts',
    'AssistantPlugin.node': 'src/AssistantPlugin.node.ts',
    'AssistantPlugin.workerd': 'src/AssistantPlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'execution-graph': 'src/execution-graph/index.ts',
    'extensions': 'src/extensions/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
