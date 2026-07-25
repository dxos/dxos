//
// Copyright 2026 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';
import { moduleSurfaces as commonSurfaces } from '@dxos/storybook-testing/modules';

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
 * `StoryRole` custom role and referenced directly as a bare token in a story layout (`StoryRole.X`).
 * Object-bound panels (documents, sketches, games, …) are dispatched directly against the real
 * plugin surfaces via `Cell.article`/`Cell.companion`, so they need no wrapper here. Generic
 * diagnostics (config, logging, invocations, execution graph) come from `moduleSurfaces`.
 */
export const moduleSurfaces: Surface.Definition[] = [
  ...commonSurfaces,

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
    id: 'role.database',
    filter: Surface.makeFilter(StoryRole.Database),
    component: DatabaseModule,
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
    id: 'role.routine',
    filter: Surface.makeFilter(StoryRole.Routine),
    component: RoutineModule,
  }),
  Surface.create({
    id: 'role.tasks',
    filter: Surface.makeFilter(StoryRole.Tasks),
    component: TasksModule,
  }),
];
