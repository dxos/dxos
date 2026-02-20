//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ObjectId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { FeedStore } from './feed-store';

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
      const feedId = ObjectId.random();

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

  it.effect('should persist feed namespace', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = ObjectId.random();
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
      const feedId = ObjectId.random();

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
      const feedId = ObjectId.random();

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
      if (result._tag === 'Failure') {
        const cause: any = result.cause;

        // Handling Effect Cause structure which might be diff in this version
        // Ideally we use Cause.isDie(cause) -> error
        // But for quick check:
        let error = cause.value || cause.defect || cause;
        if (cause._tag === 'Die') error = cause.value || cause.defect;

        expect(error).toBeDefined();
        expect(error.message).toBe('Cursor token mismatch');
      }

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
      const feedId = ObjectId.random();

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
      const feedAData = ObjectId.random();
      const firstAData = yield* feed.appendLocal([
        {
          spaceId: spaceA,
          feedId: feedAData,
          feedNamespace: nsData,
          data: new Uint8Array([1]),
        },
      ]);
      const feedATrace = ObjectId.random();
      const firstATrace = yield* feed.appendLocal([
        {
          spaceId: spaceA,
          feedId: feedATrace,
          feedNamespace: nsTrace,
          data: new Uint8Array([2]),
        },
      ]);
      const feedBData = ObjectId.random();
      const firstBData = yield* feed.appendLocal([
        {
          spaceId: spaceB,
          feedId: feedBData,
          feedNamespace: nsData,
          data: new Uint8Array([3]),
        },
      ]);
      const feedBTrace = ObjectId.random();
      const firstBHalo = yield* feed.appendLocal([
        {
          spaceId: spaceB,
          feedId: feedBTrace,
          feedNamespace: nsTrace,
          data: new Uint8Array([4]),
        },
      ]);

      // A second append in one pair should only advance that specific pair.
      const feedAData2 = ObjectId.random();
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
      const feedId = ObjectId.random();

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

  it.effect('append ignores duplicate Lamport timestamp and preserves original data', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = ObjectId.random();
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
            position: 1,
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
            position: 2,
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
      expect(queryRes.blocks[0].position).toBe(1);
      expect(queryRes.blocks[0].data).toEqual(new Uint8Array([1]));
    }).pipe(Effect.provide(TestLayer)),
  );
});
