//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';

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
export const moduleSurfaces: Surface.Root.Definition[] = [
  Surface.Root.create({
    id: 'brain.crawl',
    filter: Surface.Root.makeFilter(StoryRole.Crawl),
    component: CrawlModule,
  }),
  Surface.Root.create({
    id: 'brain.query',
    filter: Surface.Root.makeFilter(StoryRole.Query),
    component: QueryModule,
  }),
  Surface.Root.create({
    id: 'brain.questions',
    filter: Surface.Root.makeFilter(StoryRole.Questions),
    component: QuestionsModule,
  }),
  Surface.Root.create({
    id: 'brain.facts',
    filter: Surface.Root.makeFilter(StoryRole.Facts),
    component: FactsModule,
  }),
  Surface.Root.create({
    id: 'brain.entities',
    filter: Surface.Root.makeFilter(StoryRole.Entities),
    component: EntitiesModule,
  }),
  Surface.Root.create({
    id: 'brain.input',
    filter: Surface.Root.makeFilter(StoryRole.Input),
    component: InputModule,
  }),
  Surface.Root.create({
    id: 'brain.pipeline',
    filter: Surface.Root.makeFilter(StoryRole.Pipeline),
    component: PipelineModule,
  }),
  Surface.Root.create({
    id: 'brain.output',
    filter: Surface.Root.makeFilter(StoryRole.Output),
    component: OutputModule,
  }),
];
