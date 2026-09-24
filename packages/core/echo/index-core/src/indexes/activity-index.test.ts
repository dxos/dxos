//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { SpaceId } from '@dxos/keys';

import { ActivityIndex, HOUR_MS } from './activity-index.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.provideMerge(Reactivity.layer));

const HOUR = Math.floor(1700000000000 / HOUR_MS) * HOUR_MS;

const setup = Effect.gen(function* () {
  const index = new ActivityIndex(yield* SqlClient.SqlClient);
  yield* index.migrate();
  return index;
});

describe('ActivityIndex', () => {
  it.effect('buckets each document by hour and accumulates across record calls', () =>
    Effect.gen(function* () {
      const index = yield* setup;
      const spaceId = SpaceId.random();

      yield* index.record([
        {
          spaceId,
          documentId: 'a',
          full: true,
          changes: [
            { time: HOUR + 1, ops: 3 },
            { time: HOUR + 60_000, ops: 2 },
          ],
        },
        { spaceId, documentId: 'b', full: true, changes: [{ time: HOUR + 5, ops: 1 }] },
      ]);
      yield* index.record([{ spaceId, documentId: 'a', full: false, changes: [{ time: HOUR + HOUR_MS, ops: 1 }] }]);

      expect(yield* index.query({ spaceId })).toEqual([
        { documentId: 'a', hour: HOUR, changes: 2, ops: 5 },
        { documentId: 'b', hour: HOUR, changes: 1, ops: 1 },
        { documentId: 'a', hour: HOUR + HOUR_MS, changes: 1, ops: 1 },
      ]);
      expect(yield* index.query({ spaceId, documentIds: ['b'] })).toEqual([
        { documentId: 'b', hour: HOUR, changes: 1, ops: 1 },
      ]);
      expect(yield* index.query({ spaceId, documentIds: [] })).toEqual([]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a full entry replaces the document, so a replayed history counts once', () =>
    Effect.gen(function* () {
      const index = yield* setup;
      const spaceId = SpaceId.random();
      const history = { spaceId, documentId: 'a', full: true, changes: [{ time: HOUR, ops: 1 }] };

      yield* index.record([history]);
      yield* index.record([history]);
      expect(yield* index.query({ spaceId })).toEqual([{ documentId: 'a', hour: HOUR, changes: 1, ops: 1 }]);

      yield* index.record([{ spaceId, documentId: 'a', full: true, changes: [] }]);
      expect(yield* index.query({ spaceId })).toEqual([]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
