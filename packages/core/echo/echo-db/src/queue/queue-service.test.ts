import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { FeedStore } from '@dxos/feed';
import { LocalQueueServiceImpl } from './queue-service';
import { RuntimeProvider } from '@dxos/effect';
import { SpaceId, ObjectId } from '@dxos/keys';

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
});

describe('LocalQueueServiceImpl', () => {
  it.effect('should insert and query items', () =>
    Effect.gen(function* () {
      const sql = yield* SqliteClient.SqliteClient;
      const runtime = Effect.succeed(yield* Effect.runtime<any>());
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      const service = new LocalQueueServiceImpl(runtime, feedStore);

      const spaceId = SpaceId.random();
      const queueId = ObjectId.random();
      const object1 = { id: 'obj1', data: 'test1' };
      const object2 = { id: 'obj2', data: 'test2' };

      yield* Effect.promise(() => service.insertIntoQueue('default', spaceId, queueId, [object1, object2]));

      const result = yield* Effect.promise(() => service.queryQueue('default', spaceId, { queueId }));
      expect(result.objects).toEqual([object1, object2]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should delete items', () =>
    Effect.gen(function* () {
      const sql = yield* SqliteClient.SqliteClient;
      const runtime = Effect.succeed(yield* Effect.runtime<any>());
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      const service = new LocalQueueServiceImpl(runtime, feedStore);

      const spaceId = SpaceId.random();
      const queueId = ObjectId.random();
      const object1Id = ObjectId.random();
      const object1 = { id: object1Id, data: 'test1' };

      yield* Effect.promise(() => service.insertIntoQueue('default', spaceId, queueId, [object1]));
      yield* Effect.promise(() => service.deleteFromQueue('default', spaceId, queueId, [object1Id]));

      const result = yield* Effect.promise(() => service.queryQueue('default', spaceId, { queueId }));
      expect(result.objects).toHaveLength(2);
      expect(result.objects[1]).toEqual({ id: object1Id, '@deleted': true });
    }).pipe(Effect.provide(TestLayer)),
  );
});
