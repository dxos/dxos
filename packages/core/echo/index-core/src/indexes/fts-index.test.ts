//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { DXN, ObjectId, SpaceId } from '@dxos/keys';

import { FtsIndex } from './fts-index';
import type { IndexerObject } from './interface';

const TestLayer = Layer.merge(
  SqliteClient.layer({
    filename: ':memory:',
  }),
  Reactivity.layer,
);

describe('FtsIndex', () => {
  it.effect(
    'should create an FTS5 table on migrate',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      yield* index.migrate();

      const sql = yield* SqlClient.SqlClient;
      const result = yield* sql`SELECT sql FROM sqlite_master WHERE name = 'ftsIndex'`;

      expect(result).toHaveLength(1);
      expect(result[0].sql).toMatch(/fts5/i);
      expect(result[0].sql).toMatch(/snapshot/i);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should insert snapshots and query them via MATCH',
    Effect.fnUntraced(function* () {
      const index = new FtsIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          documentId: 'doc-1',
          data: {
            id: ObjectId.random(),
            '@type': DXN.parse('dxn:type:example.com/type/Person:0.1.0').toString(),
            title: 'Hello Effect',
            body: 'This is a message about Effect and SQL.',
          },
        },
      ];

      yield* index.update(objects);

      const match = yield* index.query('Effect');
      expect(match.length).toBeGreaterThan(0);
      expect(match[0].snapshot).toContain('Effect');

      const noMatch = yield* index.query('DefinitelyNotPresent');
      expect(noMatch).toHaveLength(0);
    }, Effect.provide(TestLayer)),
  );
});
