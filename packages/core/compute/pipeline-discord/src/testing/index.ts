//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { FactStore, FactStoreLive } from '@dxos/pipeline-rdf';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { ExtractedQuestionStore, MessageStore, QuestionStore } from '../stores/index.ts';

export { type Fixture, THREADED_FIXTURE, deterministicAiService, fixtureSourceLayer } from '@dxos/crawler/testing';

/** Every pipeline store over ONE shared SqlClient (bind the client per environment). */
export const storesLayer = <E>(
  client: Layer.Layer<SqlClient.SqlClient, E>,
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
    FactStoreLive.layer,
    MessageStore.layerSql,
    QuestionStore.layerSql,
    ExtractedQuestionStore.layerSql,
  ).pipe(
    // Store migrations run inside the SqlTransaction service; derive it from the same client.
    Layer.provide(SqlTransaction.layer),
    Layer.provideMerge(client),
  );
