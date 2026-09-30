//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { EchoFeedCodec } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { invariant } from '@dxos/invariant';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { type FeedService } from '@dxos/protocols/rpc';

import { LocalFeedServiceImpl } from './local-feed-service.ts';

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
});

describe('LocalFeedServiceImpl', () => {
  it.effect('should insert and query items', () =>
    Effect.gen(function* () {
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
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
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
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
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
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
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
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
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
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
        const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
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

  it.effect('subscribeSyncState recomputes only for writes to its own space', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: false });
        const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
        const service = new LocalFeedServiceImpl(runtime, feedStore);
        yield* feedStore.migrate();
        const countBlocks = vi.spyOn(feedStore, 'countNamespaceBlocks');

        const spaceId = SpaceId.random();
        const pull = yield* EffectStream.toPull(service['FeedService.subscribeSyncState']({ spaceId }));
        yield* pull;
        const readsPerRecompute = countBlocks.mock.calls.length;

        for (const target of [SpaceId.random(), spaceId]) {
          yield* service['FeedService.insertIntoFeed']({
            subspaceTag: FeedProtocol.WellKnownNamespaces.data,
            spaceId: target,
            feedId: EntityId.random(),
            objects: [JSON.stringify({ id: 'obj1', data: 'test1' })],
          });
        }

        yield* pull;
        expect(countBlocks.mock.calls.length).toBe(2 * readsPerRecompute);
      }).pipe(Effect.provide(TestLayer)),
    ),
  );

  it.effect('subscribeSyncState emits when the remote backlog changes and when pushed blocks get positions', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: false });
        const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
        const service = new LocalFeedServiceImpl(runtime, feedStore);
        yield* feedStore.migrate();

        const feedNamespace = FeedProtocol.WellKnownNamespaces.data;
        const spaceId = SpaceId.random();
        const dataState = (response: FeedService.GetSyncStateResponse) =>
          response.namespaces?.find((entry) => entry.namespace === feedNamespace);
        const pull = yield* EffectStream.toPull(service['FeedService.subscribeSyncState']({ spaceId }));
        yield* pull;

        yield* service['FeedService.insertIntoFeed']({
          subspaceTag: feedNamespace,
          spaceId,
          feedId: EntityId.random(),
          objects: [JSON.stringify({ id: 'obj1', data: 'test1' })],
        });
        const [written] = yield* pull;
        expect(dataState(written)?.blocksToPush).toBe('1');

        yield* feedStore.recordPullProgress({ spaceId, feedNamespace, lastPulledPosition: -1, blocksToPull: 3 });
        const [remote] = yield* pull;
        expect(dataState(remote)?.blocksToPull).toBe('3');

        const { blocks } = yield* feedStore.query({ spaceId, feedNamespace, unpositionedOnly: true });
        yield* feedStore.setPosition({
          spaceId,
          blocks: blocks.map((block, position) => {
            invariant(block.feedId != null, 'queried block carries no feed id');
            return {
              feedId: block.feedId,
              actorId: block.actorId,
              sequence: block.sequence,
              feedNamespace,
              position,
            };
          }),
        });
        const [pushed] = yield* pull;
        expect(dataState(pushed)?.blocksToPush).toBe('0');
      }).pipe(Effect.provide(TestLayer)),
    ),
  );

  it.effect('subscribeFeed pushes an initial snapshot, then another on a local write', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
        const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
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

  it.effect('insertIntoFeed returns the block ids that reads stamp into each object', () =>
    Effect.gen(function* () {
      const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: true });
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
      const service = new LocalFeedServiceImpl(runtime, feedStore);
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const { blocks } = yield* service['FeedService.insertIntoFeed']({
        subspaceTag: FeedProtocol.WellKnownNamespaces.data,
        spaceId,
        feedId,
        objects: [{ id: 'obj1' }, { id: 'obj2' }].map((obj) => JSON.stringify(obj)),
      });

      const result = yield* service['FeedService.queryFeed']({ query: { spaceId, feedIds: [feedId] } });
      const read = (result.objects ?? []).map((encoded) => EchoFeedCodec.blockOf(JSON.parse(encoded)));
      expect(read.map(({ actorId, sequence }) => EchoFeedCodec.blockId(actorId ?? '', sequence ?? -1))).toEqual(blocks);
      expect(read.map(({ position }) => position)).toEqual([0, 1]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('subscribeFeed deltas carry only new blocks, then the positions assigned to them', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: false });
        const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
        const service = new LocalFeedServiceImpl(runtime, feedStore);
        yield* feedStore.migrate();

        const spaceId = SpaceId.random();
        const feedId = EntityId.random();
        const insert = (id: string) =>
          service['FeedService.insertIntoFeed']({
            subspaceTag: FeedProtocol.WellKnownNamespaces.data,
            spaceId,
            feedId,
            objects: [JSON.stringify({ id })],
          });

        const { blocks: first } = yield* insert('obj1');
        const pull = yield* EffectStream.toPull(
          service['FeedService.subscribeFeed']({ query: { spaceId, feedIds: [feedId] } }),
        );
        const [initial] = yield* pull;
        expect(initial.delta).toBeUndefined();
        expect(initial.objects).toHaveLength(1);

        yield* insert('obj2');
        const [added] = yield* pull;
        expect(added.delta).toBe(true);
        expect((added.objects ?? []).map((encoded) => JSON.parse(encoded).id)).toEqual(['obj2']);
        expect(added.positions).toEqual([]);

        yield* feedStore.setPosition({
          spaceId,
          blocks: [
            {
              feedId,
              feedNamespace: FeedProtocol.WellKnownNamespaces.data,
              actorId: 'actor-id',
              sequence: 0,
              position: 5,
            },
          ],
        });
        const [positioned] = yield* pull;
        expect(positioned.objects).toEqual([]);
        expect(positioned.positions).toEqual([{ block: first?.[0], position: 5 }]);
      }).pipe(Effect.provide(TestLayer)),
    ),
  );
});
