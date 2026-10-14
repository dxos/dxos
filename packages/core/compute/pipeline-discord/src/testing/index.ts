//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/sql/SqlClient';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { FactStore, FactStoreLive } from '@dxos/pipeline-rdf';

import { ExtractedQuestionStore, MessageStore, QuestionStore } from '../stores/index.ts';

export { type Fixture, THREADED_FIXTURE, deterministicAiService, fixtureSourceLayer } from '@dxos/crawler/testing';

/**
 * Every pipeline store: the Effect-SQL stores over ONE shared SqlClient (bind the client per environment), and
 * the FactStore, which needs synchronous SQLite, over its own database (in-memory by default).
 */
export const storesLayer = <E>(
  client: Layer.Layer<SqlClient.SqlClient, E>,
  factStore: Layer.Layer<FactStore> = FactStoreLive.layerMemory,
): Layer.Layer<
  | StateStore.StateStore
  | AgentRegistry.AgentRegistry
  | FactStore
  | MessageStore.MessageStore
  | QuestionStore.QuestionStore
  | ExtractedQuestionStore.ExtractedQuestionStore,
  E
> =>
  Layer.mergeAll(
    StateStore.layerSql,
    AgentRegistry.layerSql,
    MessageStore.layerSql,
    QuestionStore.layerSql,
    ExtractedQuestionStore.layerSql,
  ).pipe(Layer.provideMerge(client), Layer.merge(factStore));
