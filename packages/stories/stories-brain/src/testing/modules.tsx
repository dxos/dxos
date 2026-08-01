//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, Capability, Plugin, Role } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { DXN } from '@dxos/keys';
import { withModuleProps } from '@dxos/story-modules';

import {
  CrawlModule,
  EntitiesModule,
  FactsModule,
  InputModule,
  OutputModule,
  PipelineModule,
  QueryModule,
  QuestionsModule,
} from '../modules';

/**
 * Role tokens for the stories-brain modules (Facts + Pipeline). Each is contributed as a dedicated
 * `Capabilities.ReactSurface` under its own role NSID (role-only dispatch), so a story layout is a
 * plain grid of these tokens and `ModuleContainer` injects the active space + attendable id into each
 * surface (`withModuleProps`).
 */
export const Module = {
  // Facts story.
  Crawl: Role.make<Record<string, any>>('org.dxos.storybook.brain.crawl'),
  Query: Role.make<Record<string, any>>('org.dxos.storybook.brain.query'),
  Questions: Role.make<Record<string, any>>('org.dxos.storybook.brain.questions'),
  Facts: Role.make<Record<string, any>>('org.dxos.storybook.brain.facts'),
  Entities: Role.make<Record<string, any>>('org.dxos.storybook.brain.entities'),
  // Pipeline story.
  Input: Role.make<Record<string, any>>('org.dxos.storybook.brain.input'),
  Pipeline: Role.make<Record<string, any>>('org.dxos.storybook.brain.pipeline'),
  Output: Role.make<Record<string, any>>('org.dxos.storybook.brain.output'),
};

/** React surfaces for the stories-brain modules, one per `Module` role token. */
const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'brain.crawl',
    filter: Surface.makeFilter(Module.Crawl),
    component: withModuleProps(CrawlModule),
  }),
  Surface.create({
    id: 'brain.query',
    filter: Surface.makeFilter(Module.Query),
    component: withModuleProps(QueryModule),
  }),
  Surface.create({
    id: 'brain.questions',
    filter: Surface.makeFilter(Module.Questions),
    component: withModuleProps(QuestionsModule),
  }),
  Surface.create({
    id: 'brain.facts',
    filter: Surface.makeFilter(Module.Facts),
    component: withModuleProps(FactsModule),
  }),
  Surface.create({
    id: 'brain.entities',
    filter: Surface.makeFilter(Module.Entities),
    component: withModuleProps(EntitiesModule),
  }),
  Surface.create({
    id: 'brain.input',
    filter: Surface.makeFilter(Module.Input),
    component: withModuleProps(InputModule),
  }),
  Surface.create({
    id: 'brain.pipeline',
    filter: Surface.makeFilter(Module.Pipeline),
    component: withModuleProps(PipelineModule),
  }),
  Surface.create({
    id: 'brain.output',
    filter: Surface.makeFilter(Module.Output),
    component: withModuleProps(OutputModule),
  }),
];

/** Contributes the Facts-story module surfaces so a story can drive them from a `ModuleContainer` layout. */
export const StoryModulesPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.brain.story.modules'), name: 'Facts Story Modules' }),
).pipe(
  Plugin.addModule({
    id: 'brain-story-modules',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => Effect.succeed(Capability.contributes(Capabilities.ReactSurface, moduleSurfaces)),
  }),
  Plugin.make,
);
