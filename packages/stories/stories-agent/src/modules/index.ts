//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';

import { AgentCompanionModule, type AgentCompanionModuleData } from './AgentCompanionModule.tsx';
import { AgentPropertiesModule } from './AgentPropertiesModule.tsx';
import { CommentsModule, type CommentsModuleData } from './CommentsModule.tsx';
import { ConversationModule } from './ConversationModule.tsx';
import { DiscordBotModule } from './DiscordBotModule.tsx';
import { PipelineDiscordModule } from './PipelineDiscordModule.tsx';

export { StorySettingsToolbar } from './StorySettingsToolbar.tsx';

/** Story panels with no plugin surface of their own. */
export const StoryRole = {
  AgentCompanion: Role.make<AgentCompanionModuleData>('org.dxos.storybook.role.agentCompanion'),
  AgentProperties: Role.make<Record<string, unknown>>('org.dxos.storybook.role.agentProperties'),
  Comments: Role.make<CommentsModuleData>('org.dxos.storybook.role.comments'),
  DiscordBot: Role.make<Record<string, unknown>>('org.dxos.storybook.role.discordBot'),
  Conversation: Role.make<Record<string, unknown>>('org.dxos.storybook.role.conversation'),
  PipelineDiscord: Role.make<Record<string, unknown>>('org.dxos.storybook.role.pipelineDiscord'),
};

export const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'role.agentCompanion',
    filter: Surface.makeFilter(StoryRole.AgentCompanion),
    component: AgentCompanionModule,
  }),
  Surface.create({
    id: 'role.agentProperties',
    filter: Surface.makeFilter(StoryRole.AgentProperties),
    component: AgentPropertiesModule,
  }),
  Surface.create({
    id: 'role.comments',
    filter: Surface.makeFilter(StoryRole.Comments),
    component: CommentsModule,
  }),
  Surface.create({
    id: 'role.discordBot',
    filter: Surface.makeFilter(StoryRole.DiscordBot),
    component: DiscordBotModule,
  }),
  Surface.create({
    id: 'role.conversation',
    filter: Surface.makeFilter(StoryRole.Conversation),
    component: ConversationModule,
  }),
  Surface.create({
    id: 'role.pipelineDiscord',
    filter: Surface.makeFilter(StoryRole.PipelineDiscord),
    component: PipelineDiscordModule,
  }),
];
