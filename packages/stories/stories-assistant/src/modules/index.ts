//
// Copyright 2025 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';
import * as StoryModules from '@dxos/storybook-testing/StoryModules';

import { AgentKnowledgeModule } from './AgentKnowledgeModule.tsx';
import { AgentModule } from './AgentModule.tsx';
import { AgentStateModule } from './AgentStateModule.tsx';
import { ArtifactsModule } from './ArtifactsModule.tsx';
import { ChatModule } from './ChatModule.tsx';
import { ChatPlaneModule } from './ChatPlaneModule.tsx';
import { ContextModule } from './ContextModule.tsx';
import { GraphModule } from './GraphModule.tsx';
import { ProcessesModule } from './ProcessesModule.tsx';
import { ProfileModule } from './ProfileModule.tsx';
import { ProjectModule } from './ProjectModule.tsx';
import { ReplayModule } from './ReplayModule.tsx';
import { ResearchInputModule } from './ResearchInputModule.tsx';
import { ResearchOutputModule } from './ResearchOutputModule.tsx';
import { TasksModule } from './TasksModule.tsx';
import { TrajectoryGraphModule } from './TrajectoryGraphModule.tsx';

/**
 * Custom roles for story panels that are NOT bound to a story-created object — the harness chat and
 * the bespoke diagnostics that have no equivalent composer plugin surface. Generic diagnostics
 * (config, database, logging, invocations, execution graph, routine) are spread in from
 * `StoryModules.Role`. Object-bound panels (documents, sketches, games, …) use `Cell.article`/
 * `Cell.companion` against the real plugin surfaces instead of a role here.
 */
export const StoryRole = {
  ...StoryModules.Role,

  Agent: Role.make<Record<string, unknown>>('org.dxos.storybook.role.agent'),
  AgentKnowledge: Role.make<Record<string, unknown>>('org.dxos.storybook.role.agentKnowledge'),
  AgentState: Role.make<Record<string, unknown>>('org.dxos.storybook.role.agentState'),
  Artifacts: Role.make<Record<string, unknown>>('org.dxos.storybook.role.artifacts'),
  Chat: Role.make<Record<string, unknown>>('org.dxos.storybook.role.chat'),
  ChatPlane: Role.make<Record<string, unknown>>('org.dxos.storybook.role.chatPlane'),
  Context: Role.make<Record<string, unknown>>('org.dxos.storybook.role.context'),
  Graph: Role.make<Record<string, unknown>>('org.dxos.storybook.role.graph'),
  Processes: Role.make<Record<string, unknown>>('org.dxos.storybook.role.processes'),
  Profile: Role.make<Record<string, unknown>>('org.dxos.storybook.role.profile'),
  Project: Role.make<Record<string, unknown>>('org.dxos.storybook.role.project'),
  Replay: Role.make<Record<string, unknown>>('org.dxos.storybook.role.replay'),
  ResearchInput: Role.make<Record<string, unknown>>('org.dxos.storybook.role.researchInput'),
  ResearchOutput: Role.make<Record<string, unknown>>('org.dxos.storybook.role.researchOutput'),
  Tasks: Role.make<Record<string, unknown>>('org.dxos.storybook.role.tasks'),
  TrajectoryGraph: Role.make<Record<string, unknown>>('org.dxos.storybook.role.trajectoryGraph'),
};

/**
 * React surfaces for the stories-assistant panels that have no equivalent composer plugin surface
 * (the harness chat and space-scoped debug views), each registered under a `StoryRole` token and
 * referenced as a bare token in a story layout. Generic diagnostics come from `StoryModules.surfaces`.
 */
export const moduleSurfaces: Surface.Definition[] = [
  ...StoryModules.surfaces,

  Surface.create({
    id: 'role.agent',
    filter: Surface.makeFilter(StoryRole.Agent),
    component: AgentModule,
  }),
  Surface.create({
    id: 'role.agentKnowledge',
    filter: Surface.makeFilter(StoryRole.AgentKnowledge),
    component: AgentKnowledgeModule,
  }),
  Surface.create({
    id: 'role.agentState',
    filter: Surface.makeFilter(StoryRole.AgentState),
    component: AgentStateModule,
  }),
  Surface.create({
    id: 'role.artifacts',
    filter: Surface.makeFilter(StoryRole.Artifacts),
    component: ArtifactsModule,
  }),
  Surface.create({
    id: 'role.chat',
    filter: Surface.makeFilter(StoryRole.Chat),
    component: ChatModule,
  }),
  Surface.create({
    id: 'role.chatPlane',
    filter: Surface.makeFilter(StoryRole.ChatPlane),
    component: ChatPlaneModule,
  }),
  Surface.create({
    id: 'role.context',
    filter: Surface.makeFilter(StoryRole.Context),
    component: ContextModule,
  }),
  Surface.create({
    id: 'role.graph',
    filter: Surface.makeFilter(StoryRole.Graph),
    component: GraphModule,
  }),
  Surface.create({
    id: 'role.profile',
    filter: Surface.makeFilter(StoryRole.Profile),
    component: ProfileModule,
  }),
  Surface.create({
    id: 'role.project',
    filter: Surface.makeFilter(StoryRole.Project),
    component: ProjectModule,
  }),
  Surface.create({
    id: 'role.replay',
    filter: Surface.makeFilter(StoryRole.Replay),
    component: ReplayModule,
  }),
  Surface.create({
    id: 'role.researchInput',
    filter: Surface.makeFilter(StoryRole.ResearchInput),
    component: ResearchInputModule,
  }),
  Surface.create({
    id: 'role.researchOutput',
    filter: Surface.makeFilter(StoryRole.ResearchOutput),
    component: ResearchOutputModule,
  }),
  Surface.create({
    id: 'role.tasks',
    filter: Surface.makeFilter(StoryRole.Tasks),
    component: TasksModule,
  }),
  Surface.create({
    id: 'role.processes',
    filter: Surface.makeFilter(StoryRole.Processes),
    component: ProcessesModule,
  }),
  Surface.create({
    id: 'role.trajectoryGraph',
    filter: Surface.makeFilter(StoryRole.TrajectoryGraph),
    component: TrajectoryGraphModule,
  }),
];

export { AgentModule } from './AgentModule.tsx';
export type { ArtifactsModuleData } from './ArtifactsModule.tsx';
export type { ChatModuleData } from './ChatModule.tsx';
export type { ChatPlaneModuleData } from './ChatPlaneModule.tsx';
export type { ReplayArgs, ReplayModuleData } from './ReplayModule.tsx';
export { SpaceTemplateToolbar } from './SpaceTemplateToolbar.tsx';
export type { TasksModuleData } from './TasksModule.tsx';
