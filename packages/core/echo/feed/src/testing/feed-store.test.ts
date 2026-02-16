//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ObjectId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { QueueProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { FeedStore } from '../feed-store';

const Block = QueueProtocol.Block;
type Block = QueueProtocol.Block;
const WellKnownNamespaces = QueueProtocol.WellKnownNamespaces;

const SqliteLayer = SqliteClient.layer({
  filename: ':memory:',
});

// Compose layers: SqliteLayer provides SqlClient, and we also need SqlTransaction.
// SqlTransaction.layer requires SqlClient, so we provide SqliteLayer to it.
const TransactionLayer = SqlTransaction.layer.pipe(Layer.provide(SqliteLayer));
const TestLayer = Layer.merge(SqliteLayer, TransactionLayer);

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
        predActorId: null,
        predSequence: null,
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
        predActorId: null,
        predSequence: null,
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
            predActorId: null,
            predSequence: null,
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
      expect(blocks[0].position).toBeNull();
      expect(blocks[0].sequence).toBe(0);
      expect(blocks[0].actorId).toBe(ALICE);
      expect(blocks[0].predActorId).toBeNull();
      expect(blocks[0].predSequence).toBeNull();
      expect(blocks[0].timestamp).toBeGreaterThan(0);
      expect(blocks[0].data).toEqual(new Uint8Array([1]));

      // Query by feedId
      const queryRes = yield* feed.query({
        query: { feedIds: [feedId] },
        position: -1,
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      }); // Use position '-1' to get everything
      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.blocks[0]).toMatchObject({ ...blocks[0], feedId, position: expect.any(Number) });
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
});
