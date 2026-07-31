//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { ExtractedQuestionStore, MessageStore, QuestionStore } from '@dxos/pipeline-discord';
import { FactStore } from '@dxos/pipeline-rdf';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

export type CrawlStores =
  | StateStore
  | AgentRegistry
  | FactStore
  | MessageStore
  | QuestionStore
  | ExtractedQuestionStore;

// In-memory wasm SQLite shared for the app session: crawl state survives across operation
// invocations (pause/resume) but not reloads. The durable OPFS client is worker-only, so
// durable-across-reload storage lands with the EDGE/worker phase.
const storesLayer: Layer.Layer<CrawlStores> = Layer.mergeAll(
  StateStore.layerSql,
  AgentRegistry.layerSql,
  FactStore.layer,
  MessageStore.layerSql,
  QuestionStore.layerSql,
  ExtractedQuestionStore.layerSql,
).pipe(Layer.provideMerge(SqliteClient.layerMemory({}).pipe(Layer.orDie)));

let runtime: ManagedRuntime.ManagedRuntime<CrawlStores, never> | undefined;

/** Lazily-created session runtime owning the crawl stores (one crawl database per client). */
export const getCrawlRuntime = (): ManagedRuntime.ManagedRuntime<CrawlStores, never> =>
  (runtime ??= ManagedRuntime.make(storesLayer));
