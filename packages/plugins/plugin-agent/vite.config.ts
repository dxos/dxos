//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    AgentPlugin: 'src/AgentPlugin.ts',
    AgentState: 'src/containers/AgentState/AgentState.tsx',
    plugin: 'src/plugin.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    translations: 'src/translations.ts',
    AgentOperation: 'src/types/AgentOperation.ts',
    DiscordBinding: 'src/types/DiscordBinding.ts',
    ChatParticipant: 'src/types/ChatParticipant.ts',
    DiscordOperation: 'src/types/DiscordOperation.ts',
    Goal: 'src/types/Goal.ts',
    InterviewSkill: 'src/skills/InterviewSkill.ts',
    Memory: 'src/types/Memory.ts',
    MemoryOperation: 'src/types/MemoryOperation.ts',
    Mode: 'src/types/Mode.ts',
    ModeOperation: 'src/types/ModeOperation.ts',
    Profile: 'src/types/Profile.ts',
    Relay: 'src/types/Relay.ts',
    RelayOperation: 'src/types/RelayOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
