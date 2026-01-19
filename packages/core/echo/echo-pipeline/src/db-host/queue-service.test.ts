//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { ObjectId, SpaceId } from '@dxos/keys';

import { LocalQueueServiceImpl } from './local-queue-service';

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
});

describe('LocalQueueServiceImpl', () => {
  it.effect('should insert and query items', () =>
    Effect.gen(function* () {
      const sql = yield* SqliteClient.SqliteClient;
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
      const service = new LocalQueueServiceImpl(runtime, feedStore);
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();
      const queueId = ObjectId.random();
      const object1 = { id: 'obj1', data: 'test1' };
      const object2 = { id: 'obj2', data: 'test2' };

      yield* Effect.promise(() =>
        service.insertIntoQueue({
          subspaceTag: 'default',
          spaceId,
          queueId,
          objects: [object1, object2],
        }),
      );

      const result = yield* Effect.promise(() =>
        service.queryQueue({
          subspaceTag: 'default',
          spaceId,
          query: { queueId },
        }),
      );
      expect(result.objects).toEqual([object1, object2]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should delete items', () =>
    Effect.gen(function* () {
      const sql = yield* SqliteClient.SqliteClient;
      const runtime = Effect.succeed(yield* Effect.runtime<any>());
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      const service = new LocalQueueServiceImpl(runtime, feedStore);
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();
      const queueId = ObjectId.random();
      const object1Id = ObjectId.random();
      const object1 = { id: object1Id, data: 'test1' };

      yield* Effect.promise(() =>
        service.insertIntoQueue({
          subspaceTag: 'default',
          spaceId,
          queueId,
          objects: [object1],
        }),
      );
      yield* Effect.promise(() =>
        service.deleteFromQueue({
          subspaceTag: 'default',
          spaceId,
          queueId,
          objectIds: [object1Id],
        }),
      );

      const result = yield* Effect.promise(() =>
        service.queryQueue({
          subspaceTag: 'default',
          spaceId,
          query: { queueId },
        }),
      );
      expect(result.objects).toHaveLength(2);
      expect(result.objects?.[1]).toEqual({ id: object1Id, '@deleted': true });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should support pagination', () =>
    Effect.gen(function* () {
      const sql = yield* SqliteClient.SqliteClient;
      const runtime = Effect.succeed(yield* Effect.runtime<any>());
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      yield* feedStore.migrate();
      const service = new LocalQueueServiceImpl(runtime, feedStore);
      const spaceId = 'space-1' as SpaceId;
      const queueId = ObjectId.random();

      // Insert 10 items
      const items = Array.from({ length: 10 }, (_, i) => ({ id: `obj${i}`, data: `test${i}` }));
      yield* Effect.promise(() =>
        service.insertIntoQueue({
          subspaceTag: 'default',
          spaceId,
          queueId,
          objects: items,
        }),
      );

      // Query first 5
      const page1 = yield* Effect.promise(() =>
        service.queryQueue({
          subspaceTag: 'default',
          spaceId,
          query: { queueId, limit: 5 },
        }),
      );
      expect(page1.objects).toHaveLength(5);
      expect(page1.objects?.[0]).toEqual(items[0]);
      expect(page1.objects?.[4]).toEqual(items[4]);
      expect(page1.nextCursor).toBeDefined();

      // Query next 5
      const page2 = yield* Effect.promise(() =>
        service.queryQueue({
          subspaceTag: 'default',
          spaceId,
          query: {
            queueId,
            limit: 5,
            after: page1.nextCursor!,
          },
        }),
      );
      expect(page2.objects).toHaveLength(5);
      expect(page2.objects?.[0]).toEqual(items[5]);
      expect(page2.objects?.[4]).toEqual(items[9]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
