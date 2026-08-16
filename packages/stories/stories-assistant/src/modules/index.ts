//
// Copyright 2025 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import { Surface } from '@dxos/app-framework/ui';
import { ModuleRole, moduleSurfaces as commonSurfaces } from '@dxos/storybook-testing/modules';

import { AgentModule } from './AgentModule';
import { ChatModule } from './ChatModule';
import { ContextModule } from './ContextModule';
import { GraphModule } from './GraphModule';
import { ResearchInputModule } from './ResearchInputModule';
import { ResearchOutputModule } from './ResearchOutputModule';
import { TasksModule } from './TasksModule';

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
  ResearchInput: Role.make<Record<string, unknown>>('org.dxos.storybook.role.researchInput'),
  ResearchOutput: Role.make<Record<string, unknown>>('org.dxos.storybook.role.researchOutput'),
  Tasks: Role.make<Record<string, unknown>>('org.dxos.storybook.role.tasks'),
};

/**
 * React surfaces for the stories-assistant panels that have no equivalent composer plugin surface
 * (the harness chat and space-scoped debug views), each registered under a `StoryRole` token and
 * referenced as a bare token in a story layout. Generic diagnostics come from `commonSurfaces`.
 */
export const moduleSurfaces: Surface.Definition[] = [
  ...commonSurfaces,

  Surface.create({
    id: 'role.agent',
    filter: Surface.makeFilter(StoryRole.Agent),
    component: AgentModule,
  }),
  Surface.create({
    id: 'role.chat',
    filter: Surface.makeFilter(StoryRole.Chat),
    component: ChatModule,
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
];

export { AgentModule } from './AgentModule';
