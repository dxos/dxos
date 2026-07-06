//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import type * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { LocalFeedServiceImpl } from './local-feed-service';

const TestLayer = SqlTransaction.layer.pipe(
  Layer.provideMerge(
    SqliteClient.layer({
      filename: ':memory:',
    }),
  ),
);

describe('LocalFeedServiceImpl', () => {
  it.effect('should insert and query items', () =>
    Effect.gen(function* () {
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransaction.SqlTransaction>();
      const service = new LocalFeedServiceImpl(runtime, feedStore);
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const object1 = { id: 'obj1', data: 'test1' };
      const object2 = { id: 'obj2', data: 'test2' };

      yield* Effect.promise(() =>
        service.insertIntoFeed({
          subspaceTag: FeedProtocol.WellKnownNamespaces.data,
          spaceId,
          feedId,
          objects: [object1, object2].map((obj) => JSON.stringify(obj)),
        }),
      );

      const result = yield* Effect.promise(() =>
        service.queryFeed({
          query: { spaceId, feedIds: [feedId] },
        }),
      );
      expect(JSON.parse(result.objects![0])).toMatchObject(object1);
      expect(JSON.parse(result.objects![1])).toMatchObject(object2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should delete items', () =>
    Effect.gen(function* () {
      const runtime = Effect.succeed(yield* Effect.runtime<any>());
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      const service = new LocalFeedServiceImpl(runtime, feedStore);
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const object1Id = EntityId.random();
      const object1 = { id: object1Id, data: 'test1' };

      yield* Effect.promise(() =>
        service.insertIntoFeed({
          subspaceTag: FeedProtocol.WellKnownNamespaces.data,
          spaceId,
          feedId,
          objects: [JSON.stringify(object1)],
        }),
      );
      yield* Effect.promise(() =>
        service.deleteFromFeed({
          subspaceTag: FeedProtocol.WellKnownNamespaces.data,
          spaceId,
          feedId,
          objectIds: [object1Id],
        }),
      );

      const result = yield* Effect.promise(() =>
        service.queryFeed({
          query: { spaceId, feedIds: [feedId] },
        }),
      );
      expect(result.objects).toHaveLength(2);
      expect(JSON.parse(result.objects![1])).toMatchObject({ 'id': object1Id, '@deleted': true });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should support pagination', () =>
    Effect.gen(function* () {
      const runtime = Effect.succeed(yield* Effect.runtime<any>());
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      yield* feedStore.migrate();
      const service = new LocalFeedServiceImpl(runtime, feedStore);
      const spaceId = 'space-1' as SpaceId;
      const feedId = EntityId.random();

      // Insert 10 items
      const items = Array.from({ length: 10 }, (_, i) => ({ id: `obj${i}`, data: `test${i}` }));
      yield* Effect.promise(() =>
        service.insertIntoFeed({
          subspaceTag: FeedProtocol.WellKnownNamespaces.data,
          spaceId,
          feedId,
          objects: items.map((item) => JSON.stringify(item)),
        }),
      );

      // Query first 5
      const page1 = yield* Effect.promise(() =>
        service.queryFeed({
          query: { spaceId, feedIds: [feedId], limit: 5 },
        }),
      );
      expect(page1.objects).toHaveLength(5);
      expect(JSON.parse(page1.objects![0])).toMatchObject(items[0]);
      expect(JSON.parse(page1.objects![4])).toMatchObject(items[4]);
      expect(page1.nextCursor).toBeDefined();

      // Query next 5
      const page2 = yield* Effect.promise(() =>
        service.queryFeed({
          query: {
            spaceId,
            feedIds: [feedId],
            limit: 5,
            after: page1.nextCursor!,
          },
        }),
      );
      expect(page2.objects).toHaveLength(5);
      expect(JSON.parse(page2.objects![0])).toMatchObject(items[5]);
      expect(JSON.parse(page2.objects![4])).toMatchObject(items[9]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should pass tombstone blocks through paginated reads', () =>
    Effect.gen(function* () {
      const runtime = Effect.succeed(yield* Effect.runtime<any>());
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      yield* feedStore.migrate();
      const service = new LocalFeedServiceImpl(runtime, feedStore);
      const spaceId = 'space-3' as SpaceId;
      const feedId = EntityId.random();
      const objectId = EntityId.random();

      yield* Effect.promise(() =>
        service.insertIntoFeed({
          subspaceTag: FeedProtocol.WellKnownNamespaces.data,
          spaceId,
          feedId,
          objects: [JSON.stringify({ id: objectId, data: 'test' })],
        }),
      );
      yield* Effect.promise(() =>
        service.deleteFromFeed({
          subspaceTag: FeedProtocol.WellKnownNamespaces.data,
          spaceId,
          feedId,
          objectIds: [objectId],
        }),
      );

      const head = yield* Effect.promise(() =>
        service.queryFeed({
          query: { spaceId, feedIds: [feedId], limit: 10 },
        }),
      );
      expect(head.objects).toHaveLength(2);
      expect(JSON.parse(head.objects![0])).toMatchObject({ id: objectId, data: 'test' });
      expect(JSON.parse(head.objects![1])).toMatchObject({ 'id': objectId, '@deleted': true });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should report local push backlog in getSyncState', () =>
    Effect.gen(function* () {
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: false });
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransaction.SqlTransaction>();
      const service = new LocalFeedServiceImpl(runtime, feedStore);
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      yield* Effect.promise(() =>
        service.insertIntoFeed({
          subspaceTag: FeedProtocol.WellKnownNamespaces.data,
          spaceId,
          feedId,
          objects: [JSON.stringify({ id: 'obj1', data: 'test1' })],
        }),
      );

      const state = yield* Effect.promise(() => service.getSyncState({ spaceId }));
      const dataState = state.namespaces?.find((entry) => entry.namespace === FeedProtocol.WellKnownNamespaces.data);
      expect(dataState?.blocksToPush).toBe('1');
      expect(dataState?.blocksToPull).toBe('0');
      expect(dataState?.totalBlocks).toBe('1');
    }).pipe(Effect.provide(TestLayer)),
  );
});
