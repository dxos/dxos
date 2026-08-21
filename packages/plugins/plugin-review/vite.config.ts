//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    CommentSkill: 'src/skills/CommentSkill.ts',
    CommentOperationHandlerSet: 'src/operations/CommentOperationHandlerSet.ts',
    index: 'src/index.ts',
    ReviewPlugin: 'src/ReviewPlugin.ts',
    plugin: 'src/plugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    AgentIdentity: 'src/types/AgentIdentity.ts',
    ReviewCapabilities: 'src/types/ReviewCapabilities.ts',
    Settings: 'src/types/Settings.ts',
    CommentCapabilities: 'src/types/CommentCapabilities.ts',
    CommentOperation: 'src/types/CommentOperation.ts',
    ReviewEvents: 'src/types/ReviewEvents.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  // The first story in a file pays the whole lazy module-load bill — tens of seconds, against a
  // couple for each story after it — which the 15s browser-mode default cannot cover.
  test: { node: true, storybook: { timeout: 60_000 } },
});
