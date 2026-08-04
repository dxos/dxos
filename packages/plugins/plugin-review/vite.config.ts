//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ReviewPlugin': 'src/ReviewPlugin.tsx',
    'ReviewPlugin.node': 'src/ReviewPlugin.node.ts',
    'ReviewPlugin.workerd': 'src/ReviewPlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'AgentIdentity': 'src/types/AgentIdentity.ts',
    'ReviewCapabilities': 'src/types/ReviewCapabilities.ts',
    'Settings': 'src/types/Settings.ts',
    'CommentCapabilities': 'src/types/CommentCapabilities.ts',
    'CommentOperation': 'src/types/CommentOperation.ts',
    'ReviewEvents': 'src/types/ReviewEvents.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
