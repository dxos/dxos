//
// Copyright 2025 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';
import { ModuleRole, moduleSurfaces as commonSurfaces } from '@dxos/storybook-testing/modules';

import { AgentModule } from './AgentModule.tsx';
import { ChatModule } from './ChatModule.tsx';
import { ContextModule } from './ContextModule.tsx';
import { GraphModule } from './GraphModule.tsx';
import { ProjectModule } from './ProjectModule.tsx';
import { ResearchInputModule } from './ResearchInputModule.tsx';
import { ResearchOutputModule } from './ResearchOutputModule.tsx';
import { TasksModule } from './TasksModule.tsx';

/**
 * Custom roles for story panels that are NOT bound to a story-created object — the harness chat and
 * the bespoke diagnostics that have no equivalent composer plugin surface. Generic diagnostics
 * (config, database, logging, invocations, execution graph, routine) are spread in from
 * `ModuleRole`. Object-bound panels (documents, sketches, games, …) use `Cell.article`/
 * `Cell.companion` against the real plugin surfaces instead of a role here.
 */
export const StoryRole = {
  ...ModuleRole,

  Agent: Role.make<Record<string, unknown>>('org.dxos.storybook.role.agent'),
  Chat: Role.make<Record<string, unknown>>('org.dxos.storybook.role.chat'),
  Context: Role.make<Record<string, unknown>>('org.dxos.storybook.role.context'),
  Graph: Role.make<Record<string, unknown>>('org.dxos.storybook.role.graph'),
  Project: Role.make<Record<string, unknown>>('org.dxos.storybook.role.project'),
  ResearchInput: Role.make<Record<string, unknown>>('org.dxos.storybook.role.researchInput'),
  ResearchOutput: Role.make<Record<string, unknown>>('org.dxos.storybook.role.researchOutput'),
  Tasks: Role.make<Record<string, unknown>>('org.dxos.storybook.role.tasks'),
};

/**
 * React surfaces for the stories-assistant panels that have no equivalent composer plugin surface
 * (the harness chat and space-scoped debug views), each registered under a `StoryRole` token and
 * referenced as a bare token in a story layout. Generic diagnostics come from `commonSurfaces`.
 */
export const moduleSurfaces: Surface.Root.Definition[] = [
  ...commonSurfaces,

  Surface.Root.create({
    id: 'role.agent',
    filter: Surface.Root.makeFilter(StoryRole.Agent),
    component: AgentModule,
  }),
  Surface.Root.create({
    id: 'role.chat',
    filter: Surface.Root.makeFilter(StoryRole.Chat),
    component: ChatModule,
  }),
  Surface.Root.create({
    id: 'role.context',
    filter: Surface.Root.makeFilter(StoryRole.Context),
    component: ContextModule,
  }),
  Surface.Root.create({
    id: 'role.graph',
    filter: Surface.Root.makeFilter(StoryRole.Graph),
    component: GraphModule,
  }),
  Surface.Root.create({
    id: 'role.project',
    filter: Surface.Root.makeFilter(StoryRole.Project),
    component: ProjectModule,
  }),
  Surface.Root.create({
    id: 'role.researchInput',
    filter: Surface.Root.makeFilter(StoryRole.ResearchInput),
    component: ResearchInputModule,
  }),
  Surface.Root.create({
    id: 'role.researchOutput',
    filter: Surface.Root.makeFilter(StoryRole.ResearchOutput),
    component: ResearchOutputModule,
  }),
  Surface.Root.create({
    id: 'role.tasks',
    filter: Surface.Root.makeFilter(StoryRole.Tasks),
    component: TasksModule,
  }),
];

export { AgentModule } from './AgentModule.tsx';
export { SpaceTemplateToolbar } from './SpaceTemplateToolbar.tsx';
