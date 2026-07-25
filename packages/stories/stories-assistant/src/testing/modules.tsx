//
// Copyright 2026 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';
import { ExecutionGraphModule, InvocationsModule, LoggingModule, withModuleProps } from '@dxos/storybook-testing';

import {
  ChatModule,
  ContextModule,
  DatabaseModule,
  GraphModule,
  ResearchInputModule,
  ResearchOutputModule,
  RoutineModule,
  StoryRole,
  TasksModule,
} from '../modules';

/**
 * React surfaces for the stories-assistant diagnostic panels that have no equivalent composer
 * plugin surface (the harness chat and space-scoped debug views). Each is registered under a
 * `StoryRole` custom role and addressed from a story layout via `Cell.surface(StoryRole.X)`.
 * Object-bound panels (documents, sketches, games, …) are dispatched directly against the real
 * plugin surfaces via `Cell.article`/`Cell.companion`, so they need no wrapper here.
 */
export const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'role.chat',
    filter: Surface.makeFilter(StoryRole.Chat),
    component: withModuleProps(ChatModule),
  }),
  Surface.create({
    id: 'role.context',
    filter: Surface.makeFilter(StoryRole.Context),
    component: withModuleProps(ContextModule),
  }),
  Surface.create({
    id: 'role.database',
    filter: Surface.makeFilter(StoryRole.Database),
    component: withModuleProps(DatabaseModule),
  }),
  Surface.create({
    id: 'role.executionGraph',
    filter: Surface.makeFilter(StoryRole.ExecutionGraph),
    component: withModuleProps(ExecutionGraphModule),
  }),
  Surface.create({
    id: 'role.graph',
    filter: Surface.makeFilter(StoryRole.Graph),
    component: withModuleProps(GraphModule),
  }),
  Surface.create({
    id: 'role.invocations',
    filter: Surface.makeFilter(StoryRole.Invocations),
    component: withModuleProps(InvocationsModule),
  }),
  Surface.create({
    id: 'role.logging',
    filter: Surface.makeFilter(StoryRole.Logging),
    component: withModuleProps(LoggingModule),
  }),
  Surface.create({
    id: 'role.researchInput',
    filter: Surface.makeFilter(StoryRole.ResearchInput),
    component: withModuleProps(ResearchInputModule),
  }),
  Surface.create({
    id: 'role.researchOutput',
    filter: Surface.makeFilter(StoryRole.ResearchOutput),
    component: withModuleProps(ResearchOutputModule),
  }),
  Surface.create({
    id: 'role.routine',
    filter: Surface.makeFilter(StoryRole.Routine),
    component: withModuleProps(RoutineModule),
  }),
  Surface.create({
    id: 'role.tasks',
    filter: Surface.makeFilter(StoryRole.Tasks),
    component: withModuleProps(TasksModule),
  }),
];
