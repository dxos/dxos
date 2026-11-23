//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'api': 'src/api/index.ts',
    'operations': 'src/operations/index.ts',
    'skills': 'src/skills/index.ts',
    'ClaudeSkill': 'src/skills/ClaudeSkill.ts',
    'translations': 'src/translations.ts',
    'ClaudeAgentOperation': 'src/types/ClaudeAgentOperation.ts',
    'ClaudeAgentSession': 'src/types/ClaudeAgentSession.ts',
    'ClaudeEvents': 'src/types/ClaudeEvents.ts',
    'ClaudeManagedAgent': 'src/types/ClaudeManagedAgent.ts',
    'types': 'src/types/index.ts',
    'ClaudeCapabilities': 'src/types/ClaudeCapabilities.ts',
    'AcpAgent': 'src/agents/AcpAgent.ts',
    'CodeAgent': 'src/agents/CodeAgent.ts',
    'ComposerMcp': 'src/agents/ComposerMcp.ts',
    'EdgeAgent': 'src/agents/EdgeAgent.ts',
    'HelperClient': 'src/agents/HelperClient.ts',
    'vite-plugin': 'src/agent-helper/index.ts',
    'Settings': 'src/types/Settings.ts',
    'State': 'src/types/State.ts',
  },
  jsx: 'react',
  test: { node: true },
});
