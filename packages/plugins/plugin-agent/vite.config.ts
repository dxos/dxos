//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    AgentPlugin: 'src/AgentPlugin.ts',
    AgentKnowledge: 'src/AgentKnowledge.ts',
    AgentState: 'src/AgentState.ts',
    plugin: 'src/plugin.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    translations: 'src/translations.ts',
    AgentChannels: 'src/types/AgentChannels.ts',
    AgentOperation: 'src/types/AgentOperation.ts',
    AgentCompanion: 'src/types/AgentCompanion.ts',
    BrainService: 'src/types/BrainService.ts',
    BrainSkill: 'src/skills/BrainSkill.ts',
    ChatParticipant: 'src/types/ChatParticipant.ts',
    FactEntry: 'src/types/FactEntry.ts',
    Goal: 'src/types/Goal.ts',
    InterviewSkill: 'src/skills/InterviewSkill.ts',
    ConversationSkill: 'src/skills/ConversationSkill.ts',
    GoalsSkill: 'src/skills/GoalsSkill.ts',
    ModesSkill: 'src/skills/ModesSkill.ts',
    NoteTakerSkill: 'src/skills/NoteTakerSkill.ts',
    RelaySkill: 'src/skills/RelaySkill.ts',
    Memory: 'src/types/Memory.ts',
    MemoryOperation: 'src/types/MemoryOperation.ts',
    Mode: 'src/types/Mode.ts',
    ModeOperation: 'src/types/ModeOperation.ts',
    Profile: 'src/types/Profile.ts',
    Relay: 'src/types/Relay.ts',
    RelayOperation: 'src/types/RelayOperation.ts',
    Trigger: 'src/types/Trigger.ts',
    TriggerOperation: 'src/types/TriggerOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
