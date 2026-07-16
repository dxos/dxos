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
    'skills/index': 'src/skills/index.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'components/index': 'src/components/index.ts',
    'containers/index': 'src/containers/index.ts',
    'execution-graph/index': 'src/execution-graph/index.ts',
    'extensions': 'src/extensions/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
