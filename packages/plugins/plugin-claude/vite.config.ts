//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ClaudePlugin: 'src/ClaudePlugin.ts',
    plugin: 'src/plugin.tsx',
    api: 'src/api/index.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    ClaudeSkill: 'src/skills/ClaudeSkill.ts',
    translations: 'src/translations.ts',
    ClaudeAgentOperation: 'src/types/ClaudeAgentOperation.ts',
    ClaudeAgentSession: 'src/types/ClaudeAgentSession.ts',
    ClaudeEvents: 'src/types/ClaudeEvents.ts',
    ClaudeManagedAgent: 'src/types/ClaudeManagedAgent.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
