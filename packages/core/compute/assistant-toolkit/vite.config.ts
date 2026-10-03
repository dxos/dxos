//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/WebSearchSkill': 'src/WebSearchSkill.ts',
    'ns/SlashCommand': 'src/SlashCommand.ts',
    'ns/SkillManagerSkill': 'src/SkillManagerSkill.ts',
    'ns/PlanningSkill': 'src/PlanningSkill.ts',
    'ns/MemorySkill': 'src/MemorySkill.ts',
    'ns/DelegationSkill': 'src/DelegationSkill.ts',
    'ns/ChatContextSkill': 'src/ChatContextSkill.ts',
    'ns/BrowserSkill': 'src/BrowserSkill.ts',
    'ns/AutomationSkill': 'src/AutomationSkill.ts',
    'ns/AlarmSkill': 'src/AlarmSkill.ts',
    'ns/AgentSkill': 'src/AgentSkill.ts',
    'ns/AgentOperationHandlerSet': 'src/AgentOperationHandlerSet.ts',
    'index': 'src/index.ts',
    'testing': 'src/testing/index.ts',
    'Memory': 'src/types/Memory.ts',
    'AgentOperation': 'src/operations/definitions.ts',
  },
  jsx: 'react',
  test: { node: true },
});
