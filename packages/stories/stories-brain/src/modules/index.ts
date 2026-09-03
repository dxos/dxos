//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import { Surface } from '@dxos/app-framework/ui';

import { CrawlModule } from './CrawlModule.tsx';
import { EntitiesModule } from './EntitiesModule.tsx';
import { FactsModule } from './FactsModule.tsx';
import { InputModule } from './InputModule.tsx';
import { OutputModule } from './OutputModule.tsx';
import { PipelineModule } from './PipelineModule.tsx';
import { QueryModule } from './QueryModule.tsx';
import { QuestionsModule } from './QuestionsModule.tsx';

export * from './context.ts';
export * from './pipeline-context.ts';

/**
 * Role tokens for the stories-brain modules (Facts + Pipeline). Each module is contributed as a
 * dedicated surface under its own role NSID (role-only dispatch), so a story layout is a plain grid
 * of these tokens; each module resolves the active space itself via `useActiveSpace()`.
 */
export const StoryRole = {
  // Facts story.
  Crawl: Role.make<Record<string, unknown>>('org.dxos.storybook.brain.crawl'),
  Query: Role.make<Record<string, unknown>>('org.dxos.storybook.brain.query'),
  Questions: Role.make<Record<string, unknown>>('org.dxos.storybook.brain.questions'),
  Facts: Role.make<Record<string, unknown>>('org.dxos.storybook.brain.facts'),
  Entities: Role.make<Record<string, unknown>>('org.dxos.storybook.brain.entities'),
  // Pipeline story.
  Input: Role.make<Record<string, unknown>>('org.dxos.storybook.brain.input'),
  Pipeline: Role.make<Record<string, unknown>>('org.dxos.storybook.brain.pipeline'),
  Output: Role.make<Record<string, unknown>>('org.dxos.storybook.brain.output'),
};

/** React surfaces for the stories-brain modules, one per `StoryRole` token. */
export const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'brain.crawl',
    filter: Surface.makeFilter(StoryRole.Crawl),
    component: CrawlModule,
  }),
  Surface.create({
    id: 'brain.query',
    filter: Surface.makeFilter(StoryRole.Query),
    component: QueryModule,
  }),
  Surface.create({
    id: 'brain.questions',
    filter: Surface.makeFilter(StoryRole.Questions),
    component: QuestionsModule,
  }),
  Surface.create({
    id: 'brain.facts',
    filter: Surface.makeFilter(StoryRole.Facts),
    component: FactsModule,
  }),
  Surface.create({
    id: 'brain.entities',
    filter: Surface.makeFilter(StoryRole.Entities),
    component: EntitiesModule,
  }),
  Surface.create({
    id: 'brain.input',
    filter: Surface.makeFilter(StoryRole.Input),
    component: InputModule,
  }),
  Surface.create({
    id: 'brain.pipeline',
    filter: Surface.makeFilter(StoryRole.Pipeline),
    component: PipelineModule,
  }),
  Surface.create({
    id: 'brain.output',
    filter: Surface.makeFilter(StoryRole.Output),
    component: OutputModule,
  }),
];
