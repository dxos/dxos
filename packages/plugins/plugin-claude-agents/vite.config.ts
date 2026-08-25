//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ClaudeAgentsPlugin: 'src/ClaudeAgentsPlugin.ts',
    plugin: 'src/plugin.tsx',
    api: 'src/api/index.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    translations: 'src/translations.ts',
    ClaudeAgentOperation: 'src/types/ClaudeAgentOperation.ts',
    ClaudeAgentSession: 'src/types/ClaudeAgentSession.ts',
    ClaudeAgentsEvents: 'src/types/ClaudeAgentsEvents.ts',
    ClaudeManagedAgent: 'src/types/ClaudeManagedAgent.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
