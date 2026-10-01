//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { afterEach, describe, test } from 'vitest';

import { RuntimeProvider } from '@dxos/effect';
import { SQL_MAX_BOUND_VARIABLES, SqlBoundVariableLimit } from '@dxos/index-core';

import { type TestSqliteRuntime, createTestSqliteRuntime } from '../testing/index.ts';
import { CLIENT_SQL_MAX_BOUND_VARIABLES, withClientSqlLimits } from './sql-limits.ts';

const prepareWithVariables = (count: number) =>
  Effect.flatMap(SqlClient.SqlClient, (sql) => sql.unsafe(`SELECT ?${count}`));

describe('client SQL limits', () => {
  let sqlite: TestSqliteRuntime | undefined;
  afterEach(async () => {
    await sqlite?.dispose();
  });

  test('index reads plan against the client limit, which the client SQLite accepts', async ({ expect }) => {
    sqlite = createTestSqliteRuntime();
    const runtime = withClientSqlLimits(sqlite.runtime);

    expect(await RuntimeProvider.runPromise(sqlite.runtime)(SqlBoundVariableLimit)).toBe(SQL_MAX_BOUND_VARIABLES);
    expect(await RuntimeProvider.runPromise(runtime)(SqlBoundVariableLimit)).toBe(CLIENT_SQL_MAX_BOUND_VARIABLES);

    await RuntimeProvider.runPromise(runtime)(prepareWithVariables(CLIENT_SQL_MAX_BOUND_VARIABLES));
    await expect(
      RuntimeProvider.runPromise(runtime)(prepareWithVariables(CLIENT_SQL_MAX_BOUND_VARIABLES + 1)),
    ).rejects.toThrow();
  });
});
