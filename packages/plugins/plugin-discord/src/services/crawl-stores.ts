//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { ExtractedQuestionStore, MessageStore, QuestionStore } from '@dxos/pipeline-discord';
import { FactStore, FactStoreLive } from '@dxos/pipeline-rdf';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

export type CrawlStores =
  | StateStore.StateStore
  | AgentRegistry.AgentRegistry
  | FactStore
  | MessageStore.MessageStore
  | QuestionStore.QuestionStore
  | ExtractedQuestionStore.ExtractedQuestionStore;

// In-memory wasm SQLite shared for the app session: crawl state survives across operation
// invocations (pause/resume) but not reloads. The durable OPFS client is worker-only, so
// durable-across-reload storage lands with the EDGE/worker phase.
const storesLayer: Layer.Layer<CrawlStores> = Layer.mergeAll(
  StateStore.layerSql,
  AgentRegistry.layerSql,
  FactStoreLive.layer,
  MessageStore.layerSql,
  QuestionStore.layerSql,
  ExtractedQuestionStore.layerSql,
).pipe(
  // Store migrations run inside the SqlTransaction service; derive it from the same client.
  Layer.provide(SqlTransaction.layer),
  Layer.provideMerge(SqliteClient.layerMemory({}).pipe(Layer.orDie)),
);

let runtime: ManagedRuntime.ManagedRuntime<CrawlStores, never> | undefined;

/** Lazily-created session runtime owning the crawl stores (one crawl database per client). */
export const getCrawlRuntime = (): ManagedRuntime.ManagedRuntime<CrawlStores, never> =>
  (runtime ??= ManagedRuntime.make(storesLayer));
