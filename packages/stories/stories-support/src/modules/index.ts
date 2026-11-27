//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';

import { DraftsModule } from './DraftsModule.tsx';
import { FactsModule } from './FactsModule.tsx';
import { MessagesModule } from './MessagesModule.tsx';
import { ObjectsModule } from './ObjectsModule.tsx';
import { PipelineModule } from './PipelineModule.tsx';
import { TasksModule } from './TasksModule.tsx';

export * from './SupportContext.tsx';

/** Roles of the story's six columns, so a layout names a column by its token. */
export const StoryRole = {
  Messages: Role.make<Record<string, unknown>>('org.dxos.stories.support.role.messages'),
  Pipeline: Role.make<Record<string, unknown>>('org.dxos.stories.support.role.pipeline'),
  Facts: Role.make<Record<string, unknown>>('org.dxos.stories.support.role.facts'),
  Objects: Role.make<Record<string, unknown>>('org.dxos.stories.support.role.objects'),
  Drafts: Role.make<Record<string, unknown>>('org.dxos.stories.support.role.drafts'),
  Tasks: Role.make<Record<string, unknown>>('org.dxos.stories.support.role.tasks'),
};

/** The columns as surfaces, contributed by the story's modules plugin. */
export const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'support.messages',
    filter: Surface.makeFilter(StoryRole.Messages),
    component: MessagesModule,
  }),
  Surface.create({
    id: 'support.pipeline',
    filter: Surface.makeFilter(StoryRole.Pipeline),
    component: PipelineModule,
  }),
  Surface.create({ id: 'support.facts', filter: Surface.makeFilter(StoryRole.Facts), component: FactsModule }),
  Surface.create({ id: 'support.objects', filter: Surface.makeFilter(StoryRole.Objects), component: ObjectsModule }),
  Surface.create({ id: 'support.drafts', filter: Surface.makeFilter(StoryRole.Drafts), component: DraftsModule }),
  Surface.create({ id: 'support.tasks', filter: Surface.makeFilter(StoryRole.Tasks), component: TasksModule }),
];
