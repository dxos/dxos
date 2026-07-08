//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Layer from 'effect/Layer';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { FactStore } from '@dxos/pipeline-rdf';

import { ExtractedQuestionStore, MessageStore, QuestionStore } from '../stores';

export { type Fixture, THREADED_FIXTURE, deterministicAiService, fixtureSourceLayer } from '@dxos/crawler/testing';

/** Every pipeline store over ONE shared SqlClient (bind the client per environment). */
export const storesLayer = <E>(
  client: Layer.Layer<SqlClient.SqlClient, E>,
): Layer.Layer<StateStore | AgentRegistry | FactStore | MessageStore | QuestionStore | ExtractedQuestionStore, E> =>
  Layer.mergeAll(
    StateStore.layerSql,
    AgentRegistry.layerSql,
    FactStore.layer,
    MessageStore.layerSql,
    QuestionStore.layerSql,
    ExtractedQuestionStore.layerSql,
  ).pipe(Layer.provideMerge(client));
