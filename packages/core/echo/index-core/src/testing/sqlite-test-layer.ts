//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import * as Statement from 'effect/unstable/sql/Statement';

import { SqlBoundVariableLimit } from '../utils.ts';

/**
 * Refuses a statement binding more variables than {@link SqlBoundVariableLimit}, as Durable Object
 * SQLite does at 100. node's SQLite accepts 32766, so without this a statement too wide for
 * production passes every test here, which is how the 2026-09-22 edge outage shipped.
 */
const refuseWideStatements: Statement.Transformer = (statement, _sql, fiber) => {
  const limit = fiber.getRef(SqlBoundVariableLimit);
  const [query, params] = statement.compile();
  return params.length > limit
    ? Effect.die(new Error(`statement binds ${params.length} variables, over the limit of ${limit}: ${query}`))
    : Effect.succeed(statement);
};

/** In-memory node SQLite for index-core tests, held to the bound-variable limit of Durable Object SQLite. */
export const TestSqliteLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(
  Layer.provideMerge(Reactivity.layer),
  Layer.provideMerge(Layer.succeed(Statement.CurrentTransformer, refuseWideStatements)),
);
