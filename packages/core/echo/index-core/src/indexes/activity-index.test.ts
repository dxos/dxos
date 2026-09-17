//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { SpaceId } from '@dxos/keys';

import { ActivityIndex } from './activity-index.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' });

describe('ActivityIndex', () => {
  it.effect('buckets changes by hour and sums changes and ops across record calls', () =>
    Effect.gen(function* () {
      const index = new ActivityIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const time = 1700000000000;

      yield* index.record([
        { spaceId, time, ops: 3 },
        { spaceId, time: time + 60_000, ops: 2 },
      ]);
      yield* index.record([{ spaceId, time: time + 3_600_000, ops: 1 }]);

      const all = yield* index.query({ spaceId });
      expect(all).toEqual([
        { hour: Math.floor(time / 3_600_000), changes: 2, ops: 5 },
        { hour: Math.floor(time / 3_600_000) + 1, changes: 1, ops: 1 },
      ]);

      const ranged = yield* index.query({ spaceId, from: time + 3_600_000 });
      expect(ranged).toEqual([{ hour: Math.floor(time / 3_600_000) + 1, changes: 1, ops: 1 }]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
