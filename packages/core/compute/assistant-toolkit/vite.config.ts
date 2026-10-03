//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/AgentOperation': 'src/AgentOperation.ts',
    'ns/WebSearchSkill': 'src/skills/websearch/WebSearchSkill.ts',
    'ns/SlashCommand': 'src/SlashCommand.ts',
    'ns/SkillManagerSkill': 'src/skills/skill-manager/SkillManagerSkill.ts',
    'ns/PlanningSkill': 'src/skills/planning/PlanningSkill.ts',
    'ns/MemorySkill': 'src/skills/memory/MemorySkill.ts',
    'ns/DelegationSkill': 'src/skills/delegation/DelegationSkill.ts',
    'ns/ChatContextSkill': 'src/skills/chat-context/ChatContextSkill.ts',
    'ns/BrowserSkill': 'src/skills/browser/BrowserSkill.ts',
    'ns/AutomationSkill': 'src/skills/automation/AutomationSkill.ts',
    'ns/AlarmSkill': 'src/skills/alarm/AlarmSkill.ts',
    'ns/AgentSkill': 'src/skills/agent/AgentSkill.ts',
    'ns/AgentOperationHandlerSet': 'src/AgentOperationHandlerSet.ts',
    'index': 'src/index.ts',
    'testing': 'src/testing/index.ts',
    'Memory': 'src/types/Memory.ts',
    'AgentOperation': 'src/operations/definitions.ts',
  },
  jsx: 'react',
  test: { node: true },
});
