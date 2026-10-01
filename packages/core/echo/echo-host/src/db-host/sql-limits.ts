//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { type RuntimeProvider } from '@dxos/effect';
import { SqlBoundVariableLimit } from '@dxos/index-core';

/**
 * Bound variables one statement may carry on the SQLite builds the client runs, wa-sqlite in the
 * browser and `node:sqlite`, which both keep SQLite's default `SQLITE_MAX_VARIABLE_NUMBER`.
 */
export const CLIENT_SQL_MAX_BOUND_VARIABLES = 32_766;

/**
 * Adds the client's SQLite limits to `runtime`, since index-core otherwise plans for Durable Object
 * SQLite's 100 variables and splits reads the client runs as one statement.
 */
export const withClientSqlLimits = <R>(
  runtime: RuntimeProvider.RuntimeProvider<R>,
): RuntimeProvider.RuntimeProvider<R> =>
  runtime.pipe(Effect.map(Context.add(SqlBoundVariableLimit, CLIENT_SQL_MAX_BOUND_VARIABLES)));
