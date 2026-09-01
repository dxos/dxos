//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as EffectStream from 'effect/Stream';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { LocalFeedServiceImpl } from './local-feed-service.ts';

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

      yield* service['FeedService.insertIntoFeed']({
        subspaceTag: FeedProtocol.WellKnownNamespaces.data,
        spaceId,
        feedId,
        objects: [object1, object2].map((obj) => JSON.stringify(obj)),
      });

      const result = yield* service['FeedService.queryFeed']({
        query: { spaceId, feedIds: [feedId] },
      });
      expect(JSON.parse(result.objects![0])).toMatchObject(object1);
      expect(JSON.parse(result.objects![1])).toMatchObject(object2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should delete items', () =>
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransaction.SqlTransaction>();
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      const service = new LocalFeedServiceImpl(runtime, feedStore);
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const object1Id = EntityId.random();
      const object1 = { id: object1Id, data: 'test1' };

      yield* service['FeedService.insertIntoFeed']({
        subspaceTag: FeedProtocol.WellKnownNamespaces.data,
        spaceId,
        feedId,
        objects: [JSON.stringify(object1)],
      });
      yield* service['FeedService.deleteFromFeed']({
        subspaceTag: FeedProtocol.WellKnownNamespaces.data,
        spaceId,
        feedId,
        objectIds: [object1Id],
      });

      const result = yield* service['FeedService.queryFeed']({
        query: { spaceId, feedIds: [feedId] },
      });
      expect(result.objects).toHaveLength(2);
      expect(JSON.parse(result.objects![1])).toMatchObject({ 'id': object1Id, '@deleted': true });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should support pagination', () =>
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransaction.SqlTransaction>();
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      yield* feedStore.migrate();
      const service = new LocalFeedServiceImpl(runtime, feedStore);
      const spaceId = 'space-1' as SpaceId;
      const feedId = EntityId.random();

      // Insert 10 items
      const items = Array.from({ length: 10 }, (_, i) => ({ id: `obj${i}`, data: `test${i}` }));
      yield* service['FeedService.insertIntoFeed']({
        subspaceTag: FeedProtocol.WellKnownNamespaces.data,
        spaceId,
        feedId,
        objects: items.map((item) => JSON.stringify(item)),
      });

      // Query first 5
      const page1 = yield* service['FeedService.queryFeed']({
        query: { spaceId, feedIds: [feedId], limit: 5 },
      });
      expect(page1.objects).toHaveLength(5);
      expect(JSON.parse(page1.objects![0])).toMatchObject(items[0]);
      expect(JSON.parse(page1.objects![4])).toMatchObject(items[4]);
      expect(page1.nextCursor).toBeDefined();

      // Query next 5
      const page2 = yield* service['FeedService.queryFeed']({
        query: {
          spaceId,
          feedIds: [feedId],
          limit: 5,
          after: page1.nextCursor!,
        },
      });
      expect(page2.objects).toHaveLength(5);
      expect(JSON.parse(page2.objects![0])).toMatchObject(items[5]);
      expect(JSON.parse(page2.objects![4])).toMatchObject(items[9]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should pass tombstone blocks through paginated reads', () =>
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransaction.SqlTransaction>();
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      yield* feedStore.migrate();
      const service = new LocalFeedServiceImpl(runtime, feedStore);
      const spaceId = 'space-3' as SpaceId;
      const feedId = EntityId.random();
      const objectId = EntityId.random();

      yield* service['FeedService.insertIntoFeed']({
        subspaceTag: FeedProtocol.WellKnownNamespaces.data,
        spaceId,
        feedId,
        objects: [JSON.stringify({ id: objectId, data: 'test' })],
      });
      yield* service['FeedService.deleteFromFeed']({
        subspaceTag: FeedProtocol.WellKnownNamespaces.data,
        spaceId,
        feedId,
        objectIds: [objectId],
      });

      const head = yield* service['FeedService.queryFeed']({
        query: { spaceId, feedIds: [feedId], limit: 10 },
      });
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
      yield* service['FeedService.insertIntoFeed']({
        subspaceTag: FeedProtocol.WellKnownNamespaces.data,
        spaceId,
        feedId,
        objects: [JSON.stringify({ id: 'obj1', data: 'test1' })],
      });

      const state = yield* service['FeedService.getSyncState']({ spaceId });
      const dataState = state.namespaces?.find((entry) => entry.namespace === FeedProtocol.WellKnownNamespaces.data);
      expect(dataState?.blocksToPush).toBe('1');
      expect(dataState?.blocksToPull).toBe('0');
      expect(dataState?.totalBlocks).toBe('1');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('subscribeSyncState pushes an initial snapshot, then another on a local write', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: false });
        const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransaction.SqlTransaction>();
        const service = new LocalFeedServiceImpl(runtime, feedStore);
        yield* feedStore.migrate();

        const spaceId = SpaceId.random();
        const feedId = EntityId.random();

        // A scoped pull, rather than a timing-based delay before the write, guarantees the
        // initial snapshot is consumed before the write fires -- so the second pull can only
        // resolve from the write's `FeedStore.onNewBlocks` signal, never from a race.
        const pull = yield* EffectStream.toPull(service['FeedService.subscribeSyncState']({ spaceId }));

        const [initial] = yield* pull;
        const initialDataState = initial.namespaces?.find(
          (entry) => entry.namespace === FeedProtocol.WellKnownNamespaces.data,
        );
        expect(initialDataState?.totalBlocks).toBe('0');

        yield* service['FeedService.insertIntoFeed']({
          subspaceTag: FeedProtocol.WellKnownNamespaces.data,
          spaceId,
          feedId,
          objects: [JSON.stringify({ id: 'obj1', data: 'test1' })],
        });

        const [next] = yield* pull;
        const nextDataState = next.namespaces?.find(
          (entry) => entry.namespace === FeedProtocol.WellKnownNamespaces.data,
        );
        expect(nextDataState?.blocksToPush).toBe('1');
        expect(nextDataState?.totalBlocks).toBe('1');
      }).pipe(Effect.provide(TestLayer)),
    ),
  );

  it.effect('subscribeFeed pushes an initial snapshot, then another on a local write', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
        const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransaction.SqlTransaction>();
        const service = new LocalFeedServiceImpl(runtime, feedStore);
        yield* feedStore.migrate();

        const spaceId = SpaceId.random();
        const feedId = EntityId.random();
        const object1 = { id: 'obj1', data: 'test1' };

        // A scoped pull, rather than a timing-based delay before the write, guarantees the
        // initial snapshot is consumed before the write fires -- so the second pull can only
        // resolve from the write's `FeedStore.onNewBlocks` signal, never from a race.
        const pull = yield* EffectStream.toPull(
          service['FeedService.subscribeFeed']({ query: { spaceId, feedIds: [feedId] } }),
        );

        const [initial] = yield* pull;
        expect(initial.objects).toHaveLength(0);

        yield* service['FeedService.insertIntoFeed']({
          subspaceTag: FeedProtocol.WellKnownNamespaces.data,
          spaceId,
          feedId,
          objects: [JSON.stringify(object1)],
        });

        const [next] = yield* pull;
        expect(next.objects).toHaveLength(1);
        expect(JSON.parse(next.objects![0])).toMatchObject(object1);
      }).pipe(Effect.provide(TestLayer)),
    ),
  );
});
