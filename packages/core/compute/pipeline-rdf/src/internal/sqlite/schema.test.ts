//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { SqlTransaction } from '@dxos/sql-sqlite';

import { migrate } from './schema.ts';

const TestLayer = SqlTransaction.layer.pipe(
  Layer.provideMerge(SqlTransaction.layer),
  Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })),
);

describe('sqlite schema', () => {
  it.effect(
    'creates the triples table',
    Effect.fnUntraced(function* () {
      yield* migrate();
      const sql = yield* SqlClient.SqlClient;
      yield* sql`INSERT INTO triples (s, p, o, oType, g) VALUES ('a', 'b', 'c', 'iri', '')`;
      const rows = yield* sql<{ s: string }>`SELECT s FROM triples WHERE p = 'b'`;
      yield* Effect.sync(() => {
        if (rows[0]?.s !== 'a') {
          throw new Error('insert/select failed');
        }
      });
    }, Effect.provide(TestLayer)),
  );
});
