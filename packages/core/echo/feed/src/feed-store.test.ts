//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Result from 'effect/Result';
import * as Tracer from 'effect/Tracer';

import { EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { FeedStore } from './feed-store';
import { createInMemoryKeyProvider, createWebCryptoCypher } from './web-crypto-cypher';

const Block = FeedProtocol.Block;
type Block = FeedProtocol.Block;
const WellKnownNamespaces = FeedProtocol.WellKnownNamespaces;

const TestLayer = SqlTransaction.layer.pipe(
  Layer.provideMerge(
    SqliteClient.layer({
      filename: ':memory:',
    }),
  ),
);

// ActorIds.
const ALICE = 'alice';

describe('Feed V2', () => {
  it.effect('should append and query blocks via RPC', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      // Append
      const block: Block = {
        feedId,
        actorId: feedId,
        sequence: 123, // Author sequence provided by peer
        prevActorId: null,
        prevSequence: null,
        position: null, // Input doesn't have position
        timestamp: Date.now(),
        data: new Uint8Array([1, 2, 3]),
      };

      const appendRes = yield* feed.append({
        requestId: 'req-1',
        blocks: [block],
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      });
      expect(appendRes.positions.length).toBe(1);
      expect(appendRes.positions[0]).toBeDefined();
      expect(appendRes.requestId).toBe('req-1');

      // Query by feedId
      const queryRes = yield* feed.query({
        requestId: 'req-2',
        query: { feedIds: [feedId] },
        position: -1,
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      }); // Use position -1 to get everything
      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.blocks[0].position).toBe(appendRes.positions[0]);
      expect(queryRes.blocks[0].sequence).toBe(123); // Verify Author Sequence is preserved
      expect(queryRes.requestId).toBe('req-2');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('stamps the space on its spans', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const spans: Tracer.Span[] = [];
      const base = yield* Effect.tracer;
      const recording = Tracer.make({
        span: (...args) => {
          const span = base.span(...args);
          spans.push(span);
          return span;
        },
      });

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();
      yield* feed
        .query({
          requestId: 'req-1',
          query: { feedIds: [] },
          position: -1,
          spaceId,
          feedNamespace: WellKnownNamespaces.data,
        })
        .pipe(Effect.provideService(Tracer.Tracer, recording));

      // The store holds every space's feeds, so a span says which one it worked on.
      const span = spans.find(({ name }) => name === 'FeedStore.query');
      expect(span?.attributes.get('spaceId')).toBe(spaceId);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should persist feed namespace', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feedNamespace = WellKnownNamespaces.data;

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      // Append with namespace
      const block = Block.make({
        feedId,
        actorId: ALICE,
        sequence: 1,
        prevActorId: null,
        prevSequence: null,
        position: null,
        timestamp: Date.now(),
        data: new Uint8Array([1]),
      });

      yield* feed.append({ requestId: 'req-ns', blocks: [block], spaceId, feedNamespace });

      // Verify directly from DB (white-box test) to ensure schema is correct
      const sql = yield* SqliteClient.SqliteClient;
      const rows = yield* sql<{ feedNamespace: string }>`
        SELECT feedNamespace FROM feeds WHERE spaceId = ${spaceId} AND feedId = ${feedId}
      `;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].feedNamespace).toBe(feedNamespace);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should use subscriptions', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      // Append some data
      yield* feed.append({
        requestId: 'req-1',
        blocks: [
          Block.make({
            feedId,
            actorId: feedId,
            sequence: 1,
            prevActorId: null,
            prevSequence: null,
            position: null,
            timestamp: Date.now(),
            data: new Uint8Array([1]),
          }),
        ],
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      });

      // Subscribe
      const subRes = yield* feed.subscribe({ requestId: 'req-2', feedIds: [feedId], spaceId });
      expect(subRes.subscriptionId).toBeDefined();
      expect(subRes.requestId).toBe('req-2');

      // Query via Subscription
      const queryRes = yield* feed.query({
        requestId: 'req-3',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { subscriptionId: subRes.subscriptionId },
        position: 0,
      });
      expect(queryRes.blocks.length).toBe(0);
      expect(queryRes.requestId).toBe('req-3');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should allow position query with unpositionedOnly false', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      yield* feed.appendLocal([
        {
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: new Uint8Array([1]),
        },
      ]);

      const queryRes = yield* feed.query({
        requestId: 'req-position-false',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: [feedId] },
        position: -1,
        unpositionedOnly: false,
      });

      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.blocks[0].feedId).toBe(feedId);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should assign monotonic insertionId', () =>
    Effect.gen(function* () {
      const feedStore = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();

      yield* feedStore.appendLocal([
        {
          spaceId,
          feedId: 'feed-1',
          feedNamespace: WellKnownNamespaces.data,
          data: new Uint8Array([1]),
        },
      ]);

      yield* feedStore.appendLocal([
        {
          spaceId,
          feedId: 'feed-2',
          feedNamespace: WellKnownNamespaces.data,
          data: new Uint8Array([2]),
        },
      ]);

      const result1 = yield* feedStore.query({
        requestId: 'req1',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: ['feed-1'] },
        position: -1,
      });

      const result2 = yield* feedStore.query({
        requestId: 'req2',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: ['feed-2'] },
        position: -1,
      });

      expect(result1.blocks[0].insertionId).toBeTypeOf('number');
      expect(result2.blocks[0].insertionId).toBeTypeOf('number');
      expect(result2.blocks[0].insertionId!).toBeGreaterThan(result1.blocks[0].insertionId!);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should assign monotonic insertionId and support token based cursor', () =>
    Effect.gen(function* () {
      const feedStore = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();

      // Append interleaving blocks
      yield* feedStore.appendLocal([
        {
          spaceId,
          feedId: 'feed-1',
          feedNamespace: WellKnownNamespaces.data,
          data: new Uint8Array([1]),
        },
      ]);
      yield* feedStore.appendLocal([
        {
          spaceId,
          feedId: 'feed-2',
          feedNamespace: WellKnownNamespaces.data,
          data: new Uint8Array([2]),
        },
      ]);
      yield* feedStore.appendLocal([
        {
          spaceId,
          feedId: 'feed-1',
          feedNamespace: WellKnownNamespaces.data,
          data: new Uint8Array([3]),
        },
      ]);

      // Query all with feedId (simulating unified query with no cursor initially)
      const feed1Res = yield* feedStore.query({
        requestId: 'req1',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: ['feed-1'] },
        cursor: undefined,
      });
      const feed2Res = yield* feedStore.query({
        requestId: 'req2',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: ['feed-2'] },
        cursor: undefined,
      });

      // Verify insertionId consistency
      const block1 = feed1Res.blocks[0]; // data=[1]
      const block2 = feed2Res.blocks[0]; // data=[2]
      const block3 = feed1Res.blocks[1]; // data=[3]

      expect(block1.insertionId).toBeLessThan(block2.insertionId!);
      expect(block2.insertionId).toBeLessThan(block3.insertionId!);

      // Verify Next Cursor format (Token|InsertionId)
      expect(feed1Res.nextCursor).toBeDefined();
      expect(feed1Res.nextCursor).toContain('|');

      // Test Query with invalid cursor token
      const invalidCursor = 'badtoken|0';
      const result = yield* feedStore
        .query({
          requestId: 'req-bad',
          spaceId,
          feedNamespace: WellKnownNamespaces.data,
          query: { feedIds: ['feed-1'] },
          cursor: invalidCursor as any,
        })
        .pipe(Effect.exit);

      expect(result._tag).toBe('Failure');
      const defect = Exit.findDefect(result);
      expect(Result.isSuccess(defect)).toBe(true);
      expect(Result.isSuccess(defect) && (defect.success as Error).message).toBe('Cursor token mismatch');

      // Test Query with VALID cursor
      // Use the cursor from the first block of feed-1 to get the second block
      // Construct cursor manually or assume we got it from somewhere.
      // Actually `nextCursor` points to the END.
      // Let's manually construct a cursor to point after the first item.
      // We need the token.
      // We can get it from nextCursor.
      const token = feed1Res.nextCursor.split('|')[0];
      const validCursor = `${token}|${block1.insertionId}`;

      const nextRes = yield* feedStore.query({
        requestId: 'req-next',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: ['feed-1'] },
        cursor: validCursor as any,
      });

      expect(nextRes.blocks.length).toBe(1);
      expect(nextRes.blocks[0].data[0]).toBe(3);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('append local', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      const blocks = yield* feed.appendLocal([
        {
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: new Uint8Array([1]),
        },
      ]);
      expect(blocks.length).toBe(1);
      expect(blocks[0].position).toBeDefined();
      expect(blocks[0].position).toBeGreaterThanOrEqual(0);
      expect(blocks[0].sequence).toBe(0);
      expect(blocks[0].actorId).toBe(ALICE);
      expect(blocks[0].prevActorId).toBeNull();
      expect(blocks[0].prevSequence).toBeNull();
      expect(blocks[0].timestamp).toBeGreaterThan(0);
      expect(blocks[0].data).toEqual(new Uint8Array([1]));

      // Query by feedId: persisted position matches returned block position.
      const queryRes = yield* feed.query({
        query: { feedIds: [feedId] },
        position: -1,
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      });
      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.blocks[0].position).toBe(blocks[0].position);
      expect(queryRes.blocks[0]).toMatchObject({ ...blocks[0], feedId });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('appendLocal returns blocks with positions from append when assignPositions is true', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      const blocks = yield* feed.appendLocal([
        { spaceId, feedId: 'feed-a', feedNamespace: WellKnownNamespaces.data, data: new Uint8Array([1]) },
        { spaceId, feedId: 'feed-b', feedNamespace: WellKnownNamespaces.data, data: new Uint8Array([2]) },
        { spaceId, feedId: 'feed-a', feedNamespace: WellKnownNamespaces.data, data: new Uint8Array([3]) },
      ]);

      expect(blocks.length).toBe(3);
      expect(blocks.every((block) => block.position != null && block.position >= 0)).toBe(true);
      expect(blocks[0].position).toBeLessThan(blocks[1].position!);
      expect(blocks[1].position).toBeLessThan(blocks[2].position!);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('assigns positions independently per feed and namespace pair', () =>
    Effect.gen(function* () {
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      const spaceA = SpaceId.random();
      const spaceB = SpaceId.random();

      const nsData = WellKnownNamespaces.data;
      const nsTrace = WellKnownNamespaces.trace;

      // First append in each (spaceId, feedNamespace) pair starts at 0.
      const feedAData = EntityId.random();
      const firstAData = yield* feed.appendLocal([
        {
          spaceId: spaceA,
          feedId: feedAData,
          feedNamespace: nsData,
          data: new Uint8Array([1]),
        },
      ]);
      const feedATrace = EntityId.random();
      const firstATrace = yield* feed.appendLocal([
        {
          spaceId: spaceA,
          feedId: feedATrace,
          feedNamespace: nsTrace,
          data: new Uint8Array([2]),
        },
      ]);
      const feedBData = EntityId.random();
      const firstBData = yield* feed.appendLocal([
        {
          spaceId: spaceB,
          feedId: feedBData,
          feedNamespace: nsData,
          data: new Uint8Array([3]),
        },
      ]);
      const feedBTrace = EntityId.random();
      const firstBHalo = yield* feed.appendLocal([
        {
          spaceId: spaceB,
          feedId: feedBTrace,
          feedNamespace: nsTrace,
          data: new Uint8Array([4]),
        },
      ]);

      // A second append in one pair should only advance that specific pair.
      const feedAData2 = EntityId.random();
      const secondAData = yield* feed.appendLocal([
        {
          spaceId: spaceA,
          feedId: feedAData2,
          feedNamespace: nsData,
          data: new Uint8Array([5]),
        },
      ]);

      // appendLocal returns blocks with positions matching persisted values.
      expect(firstAData[0].position).toBe(0);
      expect(firstATrace[0].position).toBe(0);
      expect(firstBData[0].position).toBe(0);
      expect(firstBHalo[0].position).toBe(0);
      expect(secondAData[0].position).toBe(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('tailing a feed', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      yield* feed.appendLocal([
        {
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: new Uint8Array([1]),
        },
      ]);
      const query1 = yield* feed.query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: [feedId] },
      }); // Use position '-1' to get everything
      log.info('query 1', { blocks: query1.blocks.length, cursor: query1.nextCursor });
      expect(query1.blocks.length).toBe(1);

      const query2 = yield* feed.query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: [feedId] },
        cursor: query1.nextCursor,
      });
      log.info('query 2', { blocks: query2.blocks.length, cursor: query2.nextCursor });
      expect(query2.blocks.length).toBe(0);

      yield* feed.appendLocal([
        {
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: new Uint8Array([2]),
        },
      ]);
      const query3 = yield* feed.query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: [feedId] },
        cursor: query2.nextCursor,
      });
      log.info('query 3', { blocks: query3.blocks.length, cursor: query3.nextCursor });
      expect(query3.blocks.length).toBe(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('countBlocks and deleteOldestBlocks operate per feed within space and namespace', () =>
    Effect.gen(function* () {
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      const spaceA = SpaceId.random();
      const spaceB = SpaceId.random();
      const nsData = WellKnownNamespaces.data;
      const nsTrace = WellKnownNamespaces.trace;
      const targetFeedId = 'feed-target';

      // Target feed in target namespace/space.
      yield* feed.appendLocal([
        { spaceId: spaceA, feedId: targetFeedId, feedNamespace: nsData, data: new Uint8Array([1]) },
        { spaceId: spaceA, feedId: targetFeedId, feedNamespace: nsData, data: new Uint8Array([2]) },
        { spaceId: spaceA, feedId: targetFeedId, feedNamespace: nsData, data: new Uint8Array([3]) },
        { spaceId: spaceA, feedId: targetFeedId, feedNamespace: nsData, data: new Uint8Array([4]) },
        { spaceId: spaceA, feedId: targetFeedId, feedNamespace: nsData, data: new Uint8Array([5]) },
      ]);

      // Data that must not be affected by target cleanup.
      yield* feed.appendLocal([
        { spaceId: spaceA, feedId: 'feed-other', feedNamespace: nsData, data: new Uint8Array([11]) },
        { spaceId: spaceA, feedId: 'feed-trace', feedNamespace: nsTrace, data: new Uint8Array([12]) },
        { spaceId: spaceB, feedId: targetFeedId, feedNamespace: nsData, data: new Uint8Array([13]) },
      ]);

      const beforeCount = yield* feed.countBlocks({
        spaceId: spaceA,
        feedNamespace: nsData,
        feedId: targetFeedId,
      });
      expect(beforeCount).toBe(5);

      const deleted = yield* feed.deleteOldestBlocks({
        spaceId: spaceA,
        feedNamespace: nsData,
        feedId: targetFeedId,
        count: 3,
      });
      expect(deleted).toBe(3);

      const afterCount = yield* feed.countBlocks({
        spaceId: spaceA,
        feedNamespace: nsData,
        feedId: targetFeedId,
      });
      expect(afterCount).toBe(2);

      const targetRemaining = yield* feed.query({
        requestId: 'req-target-remaining',
        spaceId: spaceA,
        feedNamespace: nsData,
        query: { feedIds: [targetFeedId] },
        position: -1,
      });
      expect(targetRemaining.blocks.length).toBe(2);
      expect(targetRemaining.blocks.map((block) => block.data[0])).toEqual([4, 5]);

      const unaffectedFeed = yield* feed.countBlocks({
        spaceId: spaceA,
        feedNamespace: nsData,
        feedId: 'feed-other',
      });
      expect(unaffectedFeed).toBe(1);

      const unaffectedNamespace = yield* feed.countBlocks({
        spaceId: spaceA,
        feedNamespace: nsTrace,
        feedId: 'feed-trace',
      });
      expect(unaffectedNamespace).toBe(1);

      const unaffectedSpace = yield* feed.countBlocks({
        spaceId: spaceB,
        feedNamespace: nsData,
        feedId: targetFeedId,
      });
      expect(unaffectedSpace).toBe(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('deleteOldestBlocks handles non-positive and oversized delete counts', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = 'feed-delete-count';
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      yield* feed.appendLocal([
        { spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: new Uint8Array([1]) },
        { spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: new Uint8Array([2]) },
      ]);

      const deletedZero = yield* feed.deleteOldestBlocks({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        feedId,
        count: 0,
      });
      expect(deletedZero).toBe(0);

      const deletedNegative = yield* feed.deleteOldestBlocks({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        feedId,
        count: -5,
      });
      expect(deletedNegative).toBe(0);

      const deletedOversized = yield* feed.deleteOldestBlocks({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        feedId,
        count: 10,
      });
      expect(deletedOversized).toBe(2);

      const remainingCount = yield* feed.countBlocks({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        feedId,
      });
      expect(remainingCount).toBe(0);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('append returns existing positions for duplicate blocks and never wastes positions', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      const makeBlock = (sequence: number): Block =>
        Block.make({
          feedId,
          actorId: ALICE,
          sequence,
          prevActorId: null,
          prevSequence: null,
          position: null,
          timestamp: Date.now(),
          data: new Uint8Array([sequence]),
        });

      const firstBlocks = [makeBlock(0), makeBlock(1), makeBlock(2)];
      const firstAppend = yield* feed.append({
        requestId: 'req-first',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        blocks: firstBlocks,
      });
      expect(firstAppend.positions).toEqual([0, 1, 2]);

      // Re-appending the same blocks must return their existing positions and not advance the
      // namespace position counter; otherwise the client would try to UPDATE blocks to wasted
      // positions and hit the (feedPrivateId, position) UNIQUE constraint.
      const secondAppend = yield* feed.append({
        requestId: 'req-second',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        blocks: firstBlocks,
      });
      expect(secondAppend.positions).toEqual([0, 1, 2]);

      // A subsequent append of new blocks should resume from position 3, not from a wasted slot.
      const newAppend = yield* feed.append({
        requestId: 'req-new',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        blocks: [makeBlock(3)],
      });
      expect(newAppend.positions).toEqual([3]);

      const all = yield* feed.query({
        requestId: 'req-query',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: [feedId] },
        position: -1,
      });
      expect(all.blocks.map((block) => block.position)).toEqual([0, 1, 2, 3]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('append ignores duplicate Lamport timestamp and preserves original data', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: false });
      yield* feed.migrate();

      const actorId = 'actor-1';
      const sequence = 5;
      const timestamp = Date.now();

      yield* feed.append({
        requestId: 'req-first',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        blocks: [
          Block.make({
            feedId,
            actorId,
            sequence,
            prevActorId: null,
            prevSequence: null,
            position: null,
            timestamp,
            data: new Uint8Array([1]),
          }),
        ],
      });

      // Same Lamport tuple with different data and position should be ignored.
      yield* feed.append({
        requestId: 'req-duplicate',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        blocks: [
          Block.make({
            feedId,
            actorId,
            sequence,
            prevActorId: null,
            prevSequence: null,
            position: null,
            timestamp: timestamp + 1,
            data: new Uint8Array([2]),
          }),
        ],
      });

      const queryRes = yield* feed.query({
        requestId: 'req-query',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        query: { feedIds: [feedId] },
        position: -1,
      });

      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.blocks[0].actorId).toBe(actorId);
      expect(queryRes.blocks[0].sequence).toBe(sequence);
      expect(queryRes.blocks[0].data).toEqual(new Uint8Array([1]));
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('FeedStore encryption', () => {
  const PLAINTEXT = new Uint8Array([9, 8, 7, 6, 5]);
  const makeCypher = () => createInMemoryKeyProvider().then((keyProvider) => createWebCryptoCypher({ keyProvider }));

  it.effect('round-trips plaintext through append and query when a cypher is configured', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const cypher = yield* Effect.promise(makeCypher);

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true, cypher });
      yield* feed.migrate();

      yield* feed.appendLocal([{ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT }]);

      const queryRes = yield* feed.query({
        requestId: 'q',
        query: { feedIds: [feedId] },
        position: -1,
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      });
      expect(queryRes.blocks.length).toBe(1);
      // Callers see plaintext with the envelope cleared.
      expect(queryRes.blocks[0].data).toEqual(PLAINTEXT);
      expect(queryRes.blocks[0].encryptionKeyId).toBeUndefined();
      expect(queryRes.blocks[0].iv).toBeUndefined();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('stores ciphertext and the envelope on disk, not plaintext', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const keyProvider = yield* Effect.promise(() => createInMemoryKeyProvider());
      const cypher = createWebCryptoCypher({ keyProvider });

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true, cypher });
      yield* feed.migrate();
      yield* feed.appendLocal([{ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT }]);

      const sql = yield* SqliteClient.SqliteClient;
      const rows = yield* sql<{ data: Uint8Array; encryptionKeyId: string | null; iv: Uint8Array | null }>`
        SELECT data, encryptionKeyId, iv FROM blocks
      `;
      expect(rows.length).toBe(1);
      expect(new Uint8Array(rows[0].data)).not.toEqual(PLAINTEXT);
      expect(rows[0].encryptionKeyId).toBe(yield* Effect.promise(() => keyProvider.currentKeyId()));
      expect(rows[0].iv).not.toBeNull();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('stores plaintext with no envelope when no cypher is configured', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();
      yield* feed.appendLocal([{ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT }]);

      const sql = yield* SqliteClient.SqliteClient;
      const rows = yield* sql<{ data: Uint8Array; encryptionKeyId: string | null; iv: Uint8Array | null }>`
        SELECT data, encryptionKeyId, iv FROM blocks
      `;
      expect(rows.length).toBe(1);
      expect(new Uint8Array(rows[0].data)).toEqual(PLAINTEXT);
      expect(rows[0].encryptionKeyId).toBeNull();
      expect(rows[0].iv).toBeNull();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('encrypts only the feeds the cypher selects', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const encryptedFeed = EntityId.random();
      const plaintextFeed = EntityId.random();
      const keyProvider = yield* Effect.promise(() => createInMemoryKeyProvider());
      const cypher = createWebCryptoCypher({
        keyProvider,
        shouldEncrypt: (feed) => feed.feedId === encryptedFeed,
      });

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true, cypher });
      yield* feed.migrate();
      yield* feed.appendLocal([
        { spaceId, feedId: encryptedFeed, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT },
        { spaceId, feedId: plaintextFeed, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT },
      ]);

      const queryRes = yield* feed.query({
        requestId: 'q',
        query: { feedIds: [encryptedFeed, plaintextFeed] },
        position: -1,
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      });
      for (const block of queryRes.blocks) {
        expect(block.data).toEqual(PLAINTEXT);
      }

      const sql = yield* SqliteClient.SqliteClient;
      const encrypted = yield* sql<{ encryptionKeyId: string | null }>`
        SELECT blocks.encryptionKeyId FROM blocks JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.feedId = ${encryptedFeed}
      `;
      expect(encrypted[0].encryptionKeyId).toBe(yield* Effect.promise(() => keyProvider.currentKeyId()));
      const plain = yield* sql<{ encryptionKeyId: string | null }>`
        SELECT blocks.encryptionKeyId FROM blocks JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.feedId = ${plaintextFeed}
      `;
      expect(plain[0].encryptionKeyId).toBeNull();
    }).pipe(Effect.provide(TestLayer)),
  );
});
