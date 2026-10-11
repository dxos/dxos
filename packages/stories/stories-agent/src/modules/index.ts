//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';

import { AgentCompanionModule, type AgentCompanionModuleData } from './AgentCompanionModule.tsx';
import { DiscordBotModule } from './DiscordBotModule.tsx';

/** Story panels with no plugin surface of their own. */
export const StoryRole = {
  AgentCompanion: Role.make<AgentCompanionModuleData>('org.dxos.storybook.role.agentCompanion'),
  DiscordBot: Role.make<Record<string, unknown>>('org.dxos.storybook.role.discordBot'),
};

export const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'role.agentCompanion',
    filter: Surface.makeFilter(StoryRole.AgentCompanion),
    component: AgentCompanionModule,
  }),
  Surface.create({
    id: 'role.discordBot',
    filter: Surface.makeFilter(StoryRole.DiscordBot),
    component: DiscordBotModule,
  }),
];
