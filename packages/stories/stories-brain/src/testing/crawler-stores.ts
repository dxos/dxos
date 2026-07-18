//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { Capability, Plugin } from '@dxos/app-framework';
import { AgentRegistry, StateStore } from '@dxos/crawler';
import { DXN } from '@dxos/keys';
import { ExtractedQuestionStore, MessageStore, QuestionStore } from '@dxos/pipeline-discord';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

/**
 * The crawler-only stores the Discord pipeline needs beyond `FactStore` — which `BrainPlugin` owns
 * (per-space, via {@link BrainCapabilities.FactStoreRegistry}). This story-local plugin provides the
 * remaining stores so a Facts-story module can run a crawl whose facts land in Brain's `FactStore`.
 */
export type CrawlerStoreServices = StateStore | AgentRegistry | MessageStore | QuestionStore | ExtractedQuestionStore;

/** All crawler stores (minus `FactStore`) over one shared in-memory wasm SQLite client. */
const crawlerStoresLayer = (): Layer.Layer<CrawlerStoreServices> =>
  Layer.mergeAll(
    StateStore.layerSql,
    AgentRegistry.layerSql,
    MessageStore.layerSql,
    QuestionStore.layerSql,
    ExtractedQuestionStore.layerSql,
  ).pipe(Layer.provideMerge(SqliteClient.layerMemory({}).pipe(Layer.orDie)));

/**
 * A long-lived runtime over the crawler stores. Modules run a crawl program through it after
 * providing `FactStore` (from Brain's registry), the Discord `Source`, and the AI service — so the
 * program's remaining requirements are exactly the services this runtime holds. Durable across
 * crawls (state accumulates over the shared SQLite client), for the session.
 */
export type CrawlerStoresRuntime = ManagedRuntime.ManagedRuntime<CrawlerStoreServices, never>;

/** Capability exposing the shared crawler-stores runtime to Facts-story modules. */
export const CrawlerStores = Capability.makeSingleton<CrawlerStoresRuntime>('org.dxos.stories.brain.crawlerStores');

const CrawlerStoresModule = Capability.makeModule(
  Effect.fnUntraced(function* () {
    const runtime = ManagedRuntime.make(crawlerStoresLayer());
    return [Capability.provide(CrawlerStores, runtime)];
  }),
);

/** Contributes the {@link CrawlerStores} runtime capability for the Facts story. */
export const CrawlerStoresPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.stories.brain.crawlerStores'), name: 'Crawler Stores' }),
).pipe(
  Plugin.addModule({
    id: 'crawler-stores',
    provides: [CrawlerStores],
    activate: CrawlerStoresModule,
  }),
  Plugin.make,
);
