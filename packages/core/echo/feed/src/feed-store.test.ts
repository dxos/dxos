//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Result from 'effect/Result';
import * as SqlClient from 'effect/sql/SqlClient';
import * as TestClock from 'effect/testing/TestClock';

import { EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';

import { FeedStore, TRIM_LIMIT, type WalkRequest } from './feed-store.ts';
import { createInMemoryKeyProvider, createWebCryptoCypher } from './web-crypto-cypher.ts';

const Block = FeedProtocol.Block;
type Block = FeedProtocol.Block;
const WellKnownNamespaces = FeedProtocol.WellKnownNamespaces;

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
});

/** A database of its own, so a replica does not read the rows of the store it replicates. */
const ReplicaLayer = () => SqliteClient.layer({ filename: ':memory:' });

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

  it.effect('append notifies on committed blocks even when the cursor token write fails', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();
      // The cursor token is written after the blocks commit, so its failure must not silence them.
      const sql = yield* SqlClient.SqlClient;
      yield* sql`DROP TABLE cursor_tokens`;
      const notified: string[] = [];
      feed.onNewBlocks.on((event) => void notified.push(event.spaceId));

      const exit = yield* Effect.exit(
        feed.append({
          spaceId,
          feedNamespace: WellKnownNamespaces.data,
          blocks: [
            {
              feedId,
              actorId: ALICE,
              sequence: 0,
              prevActorId: null,
              prevSequence: null,
              position: null,
              timestamp: 0,
              data: new Uint8Array([1]),
            },
          ],
        }),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      expect(notified).toEqual([spaceId]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('assigning a position announces a block change, not only a sync state change', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: false });
      yield* feed.migrate();
      const [block] = yield* feed.appendLocal([
        { spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: new Uint8Array([1]) },
      ]);
      const notified: string[] = [];
      feed.onNewBlocks.on((event) => void notified.push(event.spaceId));

      yield* feed.setPosition({
        spaceId,
        blocks: [
          {
            feedId,
            actorId: block.actorId,
            sequence: block.sequence,
            position: 0,
            feedNamespace: WellKnownNamespaces.data,
          },
        ],
      });

      // A feed subscription serves the position, so a push that assigns one has to wake it.
      expect(notified).toEqual([spaceId]);
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

describe('FeedStore server token', () => {
  it.effect('reports its own token from a position authority', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      const token = yield* feed.getServerToken(spaceId);
      const response = yield* feed.query({ spaceId, feedNamespace: WellKnownNamespaces.data });
      expect(response.serverToken).toBe(token);
    }).pipe(Effect.provide(TestLayer)),
  );

  // A replica's own token says nothing about the ordering it caches, and reporting it would make a
  // client treat its peer as the position authority.
  it.effect('reports no token from a store that does not assign positions', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: false });
      yield* feed.migrate();

      const response = yield* feed.query({ spaceId, feedNamespace: WellKnownNamespaces.data });
      expect(response.serverToken).toBeUndefined();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('serves a space token from memory after its first read', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();
      const token = yield* feed.getServerToken(spaceId);

      const sql = yield* SqlClient.SqlClient;
      yield* sql`DELETE FROM cursor_tokens WHERE spaceId = ${spaceId}`;
      expect(yield* feed.getServerToken(spaceId)).toBe(token);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('honours position for a client that sends a matching token or none', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();
      yield* seed(feed, spaceId, feedId, 5);
      const token = yield* feed.getServerToken(spaceId);

      const legacyClient = yield* feed.query({ spaceId, feedNamespace: WellKnownNamespaces.data, position: 2 });
      expect(legacyClient.blocks.map((block) => block.position)).toEqual([3, 4]);

      const currentClient = yield* feed.query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        position: 2,
        expectedServerToken: token,
      });
      expect(currentClient.blocks.map((block) => block.position)).toEqual([3, 4]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('ignores position when the client expected a different server', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();
      yield* seed(feed, spaceId, feedId, 5);

      const response = yield* feed.query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        position: 2,
        expectedServerToken: 'token-of-a-server-that-is-gone',
      });
      expect(response.blocks.map((block) => block.position)).toEqual([0, 1, 2, 3, 4]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('resetSyncState strips positions and restarts progress under the new token', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();
      yield* seed(feed, spaceId, feedId, 3);
      yield* feed.setSyncState({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        lastPulledPosition: 2,
        serverToken: 'old',
        blocksToPull: 5,
      });

      const changed: string[] = [];
      const blocksChanged: string[] = [];
      feed.onSyncStateChanged.on((event) => void changed.push(event.spaceId));
      feed.onNewBlocks.on((event) => void blocksChanged.push(event.spaceId));

      yield* feed.resetSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data, serverToken: 'new' });

      expect(changed).toEqual([spaceId]);
      // Stripping positions changes what a feed subscription serves, not just the sync state.
      expect(blocksChanged).toEqual([spaceId]);
      expect(yield* feed.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: -1,
        serverToken: 'new',
        // The estimate belonged to the server whose positions were just discarded.
        blocksToPull: 0,
      });
      const { blocks } = yield* feed.query({ spaceId, feedNamespace: WellKnownNamespaces.data });
      expect(blocks.map((block) => block.position)).toEqual([null, null, null]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('the backlog estimate survives a restart', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: false });
      yield* feed.migrate();
      yield* feed.setSyncState({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        lastPulledPosition: 1,
        blocksToPull: 7,
      });

      // A second store over the same database stands in for a restart: the estimate is a row, not
      // process state, so a cold start no longer reports a drained namespace.
      const restarted = new FeedStore({ localActorId: ALICE, assignPositions: false });
      const syncState = yield* restarted.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data });

      expect(syncState.blocksToPull).toBe(7);
    }).pipe(Effect.provide(TestLayer)),
  );

  const replicatedBlock = (feedId: string, actorId: string, sequence: number, position: number): Block => ({
    feedId,
    actorId,
    sequence,
    prevActorId: null,
    prevSequence: null,
    position,
    timestamp: 0,
    data: new Uint8Array([sequence]),
  });

  const seed = (feed: FeedStore, spaceId: SpaceId, feedId: string, count: number) =>
    feed.appendLocal(
      Array.from({ length: count }, (_unused, index) => ({
        spaceId,
        feedId,
        feedNamespace: WellKnownNamespaces.data,
        data: new Uint8Array([index]),
      })),
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

describe('FeedStore caught-up cursors', () => {
  /** Hides the blocks table, so any read of it fails the test rather than going unnoticed. */
  const withoutBlocks = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.acquireUseRelease(
      Effect.flatMap(SqlClient.SqlClient, (sql) => sql`ALTER TABLE blocks RENAME TO blocks_hidden`),
      () => effect,
      () => Effect.orDie(Effect.flatMap(SqlClient.SqlClient, (sql) => sql`ALTER TABLE blocks_hidden RENAME TO blocks`)),
    );

  const message = (spaceId: SpaceId, feedId: string, feedNamespace: string) => ({
    spaceId,
    feedId,
    feedNamespace,
    data: new Uint8Array([1]),
  });

  it.effect('answers a caught-up cursor without reading blocks, and sees the next append', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: false });
      yield* feed.migrate();
      yield* feed.appendLocal([message(spaceId, feedId, WellKnownNamespaces.data)]);

      const read = (cursor?: FeedProtocol.FeedCursor) =>
        feed.query({ requestId: 'r', spaceId, feedNamespace: WellKnownNamespaces.data, cursor });
      const first = yield* read();
      expect(first.blocks).toHaveLength(1);

      const idle = yield* withoutBlocks(read(first.nextCursor));
      expect(idle.blocks).toEqual([]);
      expect(idle.nextCursor).toBe(first.nextCursor);
      expect(idle.hasMore).toBe(false);

      // Another namespace moving its head leaves this cursor caught up.
      yield* feed.appendLocal([message(spaceId, EntityId.random(), WellKnownNamespaces.trace)]);
      expect((yield* withoutBlocks(read(first.nextCursor))).blocks).toEqual([]);

      yield* feed.appendLocal([message(spaceId, feedId, WellKnownNamespaces.data)]);
      const next = yield* read(first.nextCursor);
      expect(next.blocks).toHaveLength(1);
      expect(next.nextCursor).not.toBe(first.nextCursor);
    }).pipe(Effect.provide(TestLayer)),
  );

  // A feed row keeps the namespace it was created with, so a block appended under another one lands there.
  it.effect('moves the head of the namespace the feed belongs to, not the one the append named', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: false });
      yield* feed.migrate();
      yield* feed.appendLocal([message(spaceId, feedId, WellKnownNamespaces.data)]);
      const { nextCursor } = yield* feed.query({ requestId: 'r', spaceId, feedNamespace: WellKnownNamespaces.data });

      yield* feed.appendLocal([message(spaceId, feedId, WellKnownNamespaces.trace)]);
      const result = yield* feed.query({
        requestId: 'r',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        cursor: nextCursor,
      });
      expect(result.blocks).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('answers an empty namespace without reading blocks', () =>
    Effect.gen(function* () {
      const feed = new FeedStore({ localActorId: ALICE, assignPositions: false });
      yield* feed.migrate();
      const spaceId = SpaceId.random();
      // The first read of a namespace learns its head from the table; after that it is held in memory.
      yield* feed.query({ requestId: 'r', spaceId, feedNamespace: WellKnownNamespaces.trace });

      const result = yield* withoutBlocks(
        feed.query({ requestId: 'r', spaceId, feedNamespace: WellKnownNamespaces.trace }),
      );
      expect(result.blocks).toEqual([]);
      expect(result.hasMore).toBe(false);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('learns the head of blocks written before it opened', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const writer = new FeedStore({ localActorId: ALICE, assignPositions: false });
      yield* writer.migrate();
      yield* writer.appendLocal([message(spaceId, feedId, WellKnownNamespaces.data)]);
      const { nextCursor } = yield* writer.query({ requestId: 'r', spaceId, feedNamespace: WellKnownNamespaces.data });
      yield* writer.appendLocal([message(spaceId, feedId, WellKnownNamespaces.data)]);

      // A store reopened over the same database holds no head yet, so it must not mistake the cursor for caught up.
      const reopened = new FeedStore({ localActorId: ALICE, assignPositions: false });
      const result = yield* reopened.query({
        requestId: 'r',
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
        cursor: nextCursor,
      });
      expect(result.blocks).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('FeedStore retention', () => {
  const NOW = 1_800_000_000_000;
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const data = WellKnownNamespaces.data;

  /** Appends one block per timestamp as `feedId`'s next sequences, with payload bytes from `start`. */
  const appendAt = (store: FeedStore, spaceId: SpaceId, feedId: string, timestamps: number[], start = 0) =>
    store.append({
      requestId: 'append',
      spaceId,
      feedNamespace: data,
      blocks: timestamps.map((timestamp, index) => ({
        feedId,
        actorId: ALICE,
        sequence: start + index,
        prevActorId: null,
        prevSequence: null,
        position: null,
        timestamp,
        data: new Uint8Array([start + index]),
      })),
    });

  const message = (spaceId: SpaceId, feedId: string, feedNamespace: string) => ({
    spaceId,
    feedId,
    feedNamespace,
    data: new Uint8Array([1]),
  });

  const payloads = (store: FeedStore, spaceId: SpaceId, feedId: string) =>
    store
      .query({ requestId: 'q', spaceId, feedNamespace: data, query: { feedIds: [feedId] }, position: -1 })
      .pipe(Effect.map(({ blocks }) => blocks.map((block) => block.data[0])));

  it.effect('T-1: keeps the newest maxLength blocks after apply and after append', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = { spaceId, feedId, feedNamespace: data };

      yield* appendAt(
        store,
        spaceId,
        feedId,
        Array.from({ length: 10 }, () => NOW),
      );
      const applied = yield* store.setFeedOptions({ ...feed, options: { retention: { maxLength: 5 } } });
      expect(applied).toEqual({ changed: true, trim: { deleted: 5, more: false } });

      const appended = yield* appendAt(store, spaceId, feedId, [NOW, NOW, NOW], 10);
      expect(appended.trim).toEqual({ deleted: 3, more: false });
      expect(yield* payloads(store, spaceId, feedId)).toEqual([8, 9, 10, 11, 12]);
      expect(yield* store.countBlocks({ spaceId, feedNamespace: data, feedId })).toBe(5);

      const trimmed = yield* store.takeTrimmed();
      expect(trimmed.blocks.map((block) => block.insertionId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(trimmed.blocks[0]).toEqual({ spaceId, feedId, feedNamespace: data, insertionId: 1, position: 0 });
      yield* store.clearTrimmed(trimmed.maxId);
      expect(yield* store.takeTrimmed()).toEqual({ maxId: -1, blocks: [] });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('T-2: hides blocks past maxAge at once and deletes them at the next append', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();

      // Applied while neither block has expired, so only the clock moving past them can hide one.
      yield* TestClock.setTime(NOW - 3 * HOUR);
      yield* store.setFeedOptions({ spaceId, feedId, feedNamespace: data, options: { retention: { maxAge: HOUR } } });
      yield* appendAt(store, spaceId, feedId, [NOW - 2 * HOUR, NOW - 10 * MINUTE]);

      yield* TestClock.setTime(NOW);
      expect(yield* payloads(store, spaceId, feedId)).toEqual([1]);
      expect(yield* store.countBlocks({ spaceId, feedNamespace: data, feedId })).toBe(2);

      const appended = yield* appendAt(store, spaceId, feedId, [NOW], 2);
      expect(appended.trim).toEqual({ deleted: 1, more: false });
      expect(yield* payloads(store, spaceId, feedId)).toEqual([1, 2]);
      expect(yield* store.countBlocks({ spaceId, feedNamespace: data, feedId })).toBe(2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('setFeedOptions creates the row of a feed with no blocks, and getFeedOptions returns them', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feed = { spaceId, feedId: EntityId.random(), feedNamespace: data };
      expect(yield* store.getFeedOptions(feed)).toBeUndefined();

      const options = { indexing: { enabled: false }, retention: { maxLength: 3 } };
      expect(yield* store.setFeedOptions({ ...feed, options })).toEqual({
        changed: true,
        trim: { deleted: 0, more: false },
      });
      expect(yield* store.getFeedOptions(feed)).toEqual(options);
      expect(yield* store.listFeedOptions(spaceId)).toEqual(new Map([[feed.feedId, options]]));
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('lists the spaces with stored options and reads a feed namespace', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feed = { spaceId, feedId: EntityId.random(), feedNamespace: 'trace' };
      expect(yield* store.listSpacesWithOptions()).toEqual([]);
      expect(yield* store.getFeedNamespace(feed)).toBeUndefined();

      yield* store.setFeedOptions({ ...feed, options: { retention: { maxLength: 3 } } });
      expect(yield* store.listSpacesWithOptions()).toEqual([spaceId]);
      expect(yield* store.getFeedNamespace(feed)).toBe('trace');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('setFeedOptions with the stored options changes nothing and trims nothing', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feed = { spaceId, feedId: EntityId.random(), feedNamespace: data };
      yield* store.setFeedOptions({ ...feed, options: { retention: { maxLength: 1, maxAge: HOUR } } });

      // Written past the append path, so only a re-apply that trims would remove it.
      const sql = yield* SqlClient.SqlClient;
      yield* sql`
          INSERT INTO blocks (feedPrivateId, position, sequence, actorId, timestamp, data)
          SELECT feedPrivateId, value, value, ${ALICE}, ${NOW}, x'00' FROM feeds, json_each('[0, 1]')
        `;

      const reapplied = yield* store.setFeedOptions({
        ...feed,
        options: { retention: { maxAge: HOUR, maxLength: 1 } },
      });
      expect(reapplied).toEqual({ changed: false, trim: { deleted: 0, more: false } });
      expect(yield* store.countBlocks(feed)).toBe(2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('setFeedOptions rejects invalid options and stores nothing', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const feed = { spaceId: SpaceId.random(), feedId: EntityId.random(), feedNamespace: data };
      const exit = yield* Effect.exit(store.setFeedOptions({ ...feed, options: { retention: { maxLength: 0 } } }));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(yield* store.getFeedOptions(feed)).toBeUndefined();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('stored options that do not decode read as none', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feed = { spaceId, feedId: EntityId.random(), feedNamespace: data };
      yield* store.setFeedOptions({ ...feed, options: { retention: { maxLength: 1 } } });
      const sql = yield* SqlClient.SqlClient;
      yield* sql`UPDATE feeds SET options = '{"retention":'`;

      expect(yield* store.getFeedOptions(feed)).toBeUndefined();
      expect(yield* store.listFeedOptions(spaceId)).toEqual(new Map());
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('with both limits set, a block that breaks either is dropped', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      yield* TestClock.setTime(NOW);

      // Block 0 breaks only the length, block 2 only the age.
      yield* appendAt(store, spaceId, feedId, [NOW, NOW, NOW - 2 * HOUR, NOW]);
      const applied = yield* store.setFeedOptions({
        spaceId,
        feedId,
        feedNamespace: data,
        options: { retention: { maxLength: 3, maxAge: HOUR } },
      });
      expect(applied.trim).toEqual({ deleted: 2, more: false });
      expect(yield* payloads(store, spaceId, feedId)).toEqual([1, 3]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('an authority keeps its highest-positioned block past maxAge, hidden, so no position is re-issued', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feed = { spaceId, feedId: EntityId.random(), feedNamespace: data };
      yield* appendAt(store, spaceId, feed.feedId, [NOW - 2 * HOUR, NOW - 2 * HOUR]);

      yield* TestClock.setTime(NOW);
      const applied = yield* store.setFeedOptions({ ...feed, options: { retention: { maxAge: HOUR } } });
      expect(applied.trim).toEqual({ deleted: 1, more: false });
      expect(yield* payloads(store, spaceId, feed.feedId)).toEqual([]);

      const appended = yield* appendAt(store, spaceId, feed.feedId, [NOW], 2);
      expect(appended.positions).toEqual([2]);
      expect(appended.trim).toEqual({ deleted: 1, more: false });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('the host cap applies without options, and a feed maxLength can only lower it', () =>
    Effect.gen(function* () {
      const store = new FeedStore({
        localActorId: ALICE,
        assignPositions: true,
        maxLengthCap: (feedNamespace) => (feedNamespace === WellKnownNamespaces.trace ? 3 : undefined),
      });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feed = { spaceId, feedId: EntityId.random(), feedNamespace: WellKnownNamespaces.trace };
      yield* store.appendLocal(Array.from({ length: 5 }, () => message(spaceId, feed.feedId, feed.feedNamespace)));
      expect(yield* store.countBlocks(feed)).toBe(3);

      yield* store.setFeedOptions({ ...feed, options: { retention: { maxLength: 10 } } });
      expect(yield* store.countBlocks(feed)).toBe(3);
      yield* store.setFeedOptions({ ...feed, options: { retention: { maxLength: 1 } } });
      expect(yield* store.countBlocks(feed)).toBe(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('deletes at most TRIM_LIMIT blocks per call and reports more until done', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feed = { spaceId, feedId: EntityId.random(), feedNamespace: data };
      const other = { spaceId, feedId: EntityId.random(), feedNamespace: data };
      yield* store.setFeedOptions({ ...feed, options: {} });
      yield* store.setFeedOptions({ ...other, options: {} });

      // Bulk-inserted, since TRIM_LIMIT appends one by one would dominate the suite.
      const sql = yield* SqlClient.SqlClient;
      yield* sql`
          WITH RECURSIVE seq(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM seq WHERE n < ${TRIM_LIMIT + 9})
          INSERT INTO blocks (feedPrivateId, position, sequence, actorId, timestamp, data)
          SELECT feeds.feedPrivateId, NULL, n, ${ALICE}, ${NOW}, x'00'
          FROM seq, feeds WHERE feeds.feedId IN (${feed.feedId}, ${other.feedId})
        `;

      const first = yield* store.setFeedOptions({ ...feed, options: { retention: { maxLength: 1 } } });
      expect(first.trim).toEqual({ deleted: TRIM_LIMIT, more: true });
      expect(yield* store.trim(feed, NOW)).toEqual({ deleted: 9, more: false });
      expect(yield* store.trim(feed, NOW)).toEqual({ deleted: 0, more: false });
      expect(yield* store.countBlocks(feed)).toBe(1);

      // Set past setFeedOptions so that trimAll does the whole trim, from one budget for both feeds.
      yield* sql`UPDATE feeds SET options = ${'{"retention":{"maxLength":1}}'} WHERE feedId = ${other.feedId}`;
      yield* sql`
          INSERT INTO blocks (feedPrivateId, position, sequence, actorId, timestamp, data)
          SELECT feedPrivateId, NULL, ${TRIM_LIMIT + 10}, ${ALICE}, ${NOW}, x'00' FROM feeds WHERE feedId = ${feed.feedId}
        `;
      expect(yield* store.trimAll(spaceId, NOW)).toEqual({ deleted: TRIM_LIMIT, more: true });
      expect(yield* store.trimAll(spaceId, NOW)).toEqual({ deleted: 10, more: false });
      expect(yield* store.countBlocks(feed)).toBe(1);
      expect(yield* store.countBlocks(other)).toBe(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('repeated trims converge on the same retained blocks', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feed = { spaceId, feedId, feedNamespace: data };
      yield* appendAt(store, spaceId, feedId, [NOW - 3 * HOUR, NOW - 2 * HOUR, NOW, NOW, NOW, NOW]);
      const sql = yield* SqlClient.SqlClient;
      yield* sql`UPDATE feeds SET options = ${'{"retention":{"maxLength":3,"maxAge":3600000}}'}`;

      expect(yield* store.trimAll(spaceId, NOW)).toEqual({ deleted: 3, more: false });
      const retained = yield* payloads(store, spaceId, feedId);
      expect(retained).toEqual([3, 4, 5]);
      expect(yield* store.trim(feed, NOW)).toEqual({ deleted: 0, more: false });
      expect(yield* store.trimAll(spaceId, NOW)).toEqual({ deleted: 0, more: false });
      expect(yield* payloads(store, spaceId, feedId)).toEqual(retained);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a replica never trims blocks it has not pushed', () =>
    Effect.gen(function* () {
      const store = new FeedStore({ localActorId: ALICE, assignPositions: false });
      yield* store.migrate();
      const spaceId = SpaceId.random();
      const feed = { spaceId, feedId: EntityId.random(), feedNamespace: data };
      yield* store.appendLocal(Array.from({ length: 5 }, () => message(spaceId, feed.feedId, data)));

      const applied = yield* store.setFeedOptions({ ...feed, options: { retention: { maxLength: 2 } } });
      expect(applied.trim).toEqual({ deleted: 0, more: false });
      expect(yield* store.countBlocks(feed)).toBe(5);

      // Once the authority acknowledges the oldest three, they are trimmable.
      yield* store.setPosition({
        spaceId,
        blocks: [0, 1, 2].map((sequence) => ({ ...feed, actorId: ALICE, sequence, position: sequence })),
      });
      expect(yield* store.trim(feed, NOW)).toEqual({ deleted: 3, more: false });
      expect(yield* store.countBlocks(feed)).toBe(2);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('FeedStore branches', () => {
  const namespace = FeedProtocol.WellKnownNamespaces.data;

  const blockId = (block: FeedProtocol.Block) => FeedProtocol.formatBlockId(block.actorId, block.sequence);

  const prevOf = (block: FeedProtocol.Block) =>
    block.prevActorId === null || block.prevSequence === null
      ? null
      : FeedProtocol.formatBlockId(block.prevActorId, block.prevSequence);

  const setup = Effect.gen(function* () {
    const spaceId = SpaceId.random();
    const feedId = EntityId.random();
    const store = new FeedStore({ localActorId: 'alice', assignPositions: true });
    yield* store.migrate();
    const append = (options: { forkAt: string } | { branch?: string | null } = {}) =>
      store
        .appendLocal([{ spaceId, feedId, feedNamespace: namespace, data: new Uint8Array([1]), ...options }])
        .pipe(Effect.map(([block]) => block));
    const read = store
      .query({ requestId: 'read', spaceId, feedNamespace: namespace, query: { feedIds: [feedId] }, position: -1 })
      .pipe(Effect.map(({ blocks }) => blocks));
    return { spaceId, feedId, store, append, read };
  });

  it.effect('a continuation follows the head of its branch, and a fork follows its fork point', () =>
    Effect.gen(function* () {
      const { append, read } = yield* setup;
      const a1 = yield* append();
      const a2 = yield* append();
      const b1 = yield* append({ forkAt: blockId(a1) });
      const branch = blockId(b1);
      const b2 = yield* append({ branch });
      const a3 = yield* append();

      expect(prevOf(a1)).toBeNull();
      expect(prevOf(a2)).toEqual(blockId(a1));
      expect(b1.fork).toBe(true);
      expect(prevOf(b1)).toEqual(blockId(a1));
      expect(prevOf(b2)).toEqual(branch);
      expect(prevOf(a3)).toEqual(blockId(a2));

      const blocks = yield* read;
      expect(blocks.map((block) => [blockId(block), block.fork ?? false, block.branch])).toEqual([
        [blockId(a1), false, null],
        [blockId(a2), false, null],
        [branch, true, branch],
        [blockId(b2), false, branch],
        [blockId(a3), false, null],
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('keeps one row for each branch, with its base branch, its fork point and its head', () =>
    Effect.gen(function* () {
      const { append, read } = yield* setup;
      const a1 = yield* append();
      yield* append();
      const b1 = yield* append({ forkAt: blockId(a1) });
      const b2 = yield* append({ branch: blockId(b1) });
      const c1 = yield* append({ forkAt: blockId(b2) });

      const insertionIds = new Map((yield* read).map((block) => [blockId(block), block.insertionId]));
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{
        branchId: string;
        baseBranchId: string | null;
        baseInsertionId: number;
        forkInsertionId: number | null;
        headSequence: number;
      }>`SELECT branchId, baseBranchId, baseInsertionId, forkInsertionId, headSequence FROM branches ORDER BY baseInsertionId`;
      expect(rows).toEqual([
        {
          branchId: '',
          baseBranchId: null,
          baseInsertionId: insertionIds.get(blockId(a1)),
          forkInsertionId: null,
          headSequence: 1,
        },
        {
          branchId: blockId(b1),
          baseBranchId: '',
          baseInsertionId: insertionIds.get(blockId(b1)),
          forkInsertionId: insertionIds.get(blockId(a1)),
          headSequence: b2.sequence,
        },
        {
          branchId: blockId(c1),
          baseBranchId: blockId(b1),
          baseInsertionId: insertionIds.get(blockId(c1)),
          forkInsertionId: insertionIds.get(blockId(b2)),
          headSequence: c1.sequence,
        },
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a replica infers the same branches from the fork flag and the predecessors', () =>
    Effect.gen(function* () {
      const { spaceId, append, read } = yield* setup;
      const a1 = yield* append();
      const b1 = yield* append({ forkAt: blockId(a1) });
      yield* append({ branch: blockId(b1) });
      yield* append();
      const written = yield* read;

      // The local columns stay behind: the replica infers them again.
      const blocks = written.map(({ branch: _branch, insertionId: _insertionId, ...block }) => block);
      const { blocks: replicated } = yield* Effect.gen(function* () {
        const replica = new FeedStore({ localActorId: 'bob', assignPositions: false });
        yield* replica.migrate();
        yield* replica.append({ requestId: 'pull', spaceId, feedNamespace: namespace, blocks });
        return yield* replica.query({
          requestId: 'read',
          spaceId,
          feedNamespace: namespace,
          query: { feedIds: [blocks[0].feedId ?? ''] },
          position: -1,
        });
      }).pipe(Effect.provide(ReplicaLayer()));
      expect(replicated.map((block) => [blockId(block), block.branch])).toEqual(
        written.map((block) => [blockId(block), block.branch]),
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a replica that receives a fork before its fork point still walks to its ancestors', () =>
    Effect.gen(function* () {
      const { spaceId, feedId, append, read } = yield* setup;
      const a1 = yield* append();
      const b1 = yield* append({ forkAt: blockId(a1) });
      const written = (yield* read).map(({ branch: _branch, insertionId: _insertionId, ...block }) => block);
      const [rootBlock, forkBlock] = written;

      const walked = yield* Effect.gen(function* () {
        const replica = new FeedStore({ localActorId: 'bob', assignPositions: false });
        yield* replica.migrate();
        yield* replica.append({ requestId: 'fork', spaceId, feedNamespace: namespace, blocks: [forkBlock] });
        yield* replica.append({ requestId: 'root', spaceId, feedNamespace: namespace, blocks: [rootBlock] });
        return yield* replica.walk({
          spaceId,
          feedNamespace: namespace,
          feedId,
          branch: blockId(b1),
          direction: 'asc',
        });
      }).pipe(Effect.provide(ReplicaLayer()));
      expect(walked.map(blockId)).toEqual([blockId(a1), blockId(b1)]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('refuses a continuation of a branch the feed does not hold', () =>
    Effect.gen(function* () {
      const { append } = yield* setup;
      yield* append();
      const exit = yield* Effect.exit(append({ branch: '7@nobody' }));
      expect(Exit.isFailure(exit)).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('refuses a fork at a block the feed does not hold', () =>
    Effect.gen(function* () {
      const { append } = yield* setup;
      yield* append();
      const exit = yield* Effect.exit(append({ forkAt: '7@nobody' }));
      expect(Exit.isFailure(exit)).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );

  describe('walk', () => {
    // a1 a2 b1(fork at a1) a3 b2 c1(fork at b1) b3: the root, a branch of it, and a branch of that.
    const tree = Effect.gen(function* () {
      const context = yield* setup;
      const { append } = context;
      const a1 = yield* append();
      const a2 = yield* append();
      const b1 = yield* append({ forkAt: blockId(a1) });
      const a3 = yield* append();
      const b2 = yield* append({ branch: blockId(b1) });
      const c1 = yield* append({ forkAt: blockId(b1) });
      const b3 = yield* append({ branch: blockId(b1) });
      const names = new Map(
        Object.entries({ a1, a2, b1, a3, b2, c1, b3 }).map(([name, block]) => [blockId(block), name]),
      );
      const walk = (request: Omit<WalkRequest, 'spaceId' | 'feedNamespace' | 'feedId'>) =>
        context.store
          .walk({ spaceId: context.spaceId, feedNamespace: namespace, feedId: context.feedId, ...request })
          .pipe(Effect.map((blocks) => blocks.map((block) => names.get(blockId(block)))));
      return {
        walk,
        store: context.store,
        spaceId: context.spaceId,
        feedId: context.feedId,
        branchB: blockId(b1),
        branchC: blockId(c1),
        a1: blockId(a1),
        b2: blockId(b2),
      };
    });

    it.effect('forward to the root branch gives only the root', () =>
      Effect.gen(function* () {
        const { walk } = yield* tree;
        expect(yield* walk({ direction: 'asc' })).toEqual(['a1', 'a2', 'a3']);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('forward to a nested branch cuts each ancestor at the fork point of the next', () =>
      Effect.gen(function* () {
        const { walk, branchB, branchC } = yield* tree;
        expect(yield* walk({ direction: 'asc', branch: branchB })).toEqual(['a1', 'b1', 'b2', 'b3']);
        expect(yield* walk({ direction: 'asc', branch: branchC })).toEqual(['a1', 'b1', 'c1']);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('with forks, a walk gives the base of each branch that forks at a walked block', () =>
      Effect.gen(function* () {
        const { walk, branchB } = yield* tree;
        expect(yield* walk({ direction: 'asc', forks: true })).toEqual(['a1', 'b1', 'a2', 'a3']);
        expect(yield* walk({ direction: 'asc', branch: branchB, forks: true })).toEqual(['a1', 'b1', 'c1', 'b2', 'b3']);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('a cursor resumes after its block, also after a fork base', () =>
      Effect.gen(function* () {
        const { walk, branchB, a1 } = yield* tree;
        expect(yield* walk({ direction: 'asc', branch: branchB, after: a1 })).toEqual(['b1', 'b2', 'b3']);
        expect(yield* walk({ direction: 'asc', forks: true, after: branchB })).toEqual(['a2', 'a3']);
        expect(yield* walk({ direction: 'asc', after: '9@nobody' })).toEqual([]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('a walk hides blocks past the maxAge of the feed, as every other read does', () =>
      Effect.gen(function* () {
        const { walk, store, spaceId, feedId } = yield* tree;
        expect(yield* walk({ direction: 'asc' })).toEqual(['a1', 'a2', 'a3']);
        // Applied while no block has expired, so only the clock moving past them can hide one.
        yield* TestClock.setTime(Date.now());
        yield* store.setFeedOptions({
          spaceId,
          feedId,
          feedNamespace: namespace,
          options: { retention: { maxAge: 60_000 } },
        });
        yield* TestClock.setTime(Date.now() + 120_000);
        expect(yield* walk({ direction: 'asc' })).toEqual([]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('backward from a block goes to the root base through each base branch', () =>
      Effect.gen(function* () {
        const { walk, branchB, b2 } = yield* tree;
        expect(yield* walk({ direction: 'desc', after: b2 })).toEqual(['b1', 'a1']);
        expect(yield* walk({ direction: 'desc', branch: branchB })).toEqual(['b3', 'b2', 'b1', 'a1']);
      }).pipe(Effect.provide(TestLayer)),
    );
  });
});
