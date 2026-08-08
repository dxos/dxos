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
    'AgentIdentity': 'src/types/AgentIdentity.ts',
    'ReviewCapabilities': 'src/types/ReviewCapabilities.ts',
    'Settings': 'src/types/Settings.ts',
    'CommentCapabilities': 'src/types/CommentCapabilities.ts',
    'CommentOperation': 'src/types/CommentOperation.ts',
    'ReviewEvents': 'src/types/ReviewEvents.ts',
  },
  jsx: 'react',
  // The story's first render waits on the demand-gated activation pass (the Idle wave plus every
  // plugin's start event), which costs several seconds before the play can begin, so the 15s
  // browser-mode default no longer clears it.
  test: { node: true, storybook: { timeout: 60_000 } },
});
