import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { FeedStore } from './feed';
import { Block } from './protocol';
import { ObjectId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
});

// ActorIds.
const ALICE = 'alice';
const BOB = 'bob';

describe('Feed V2', () => {
  it.effect('should append and query blocks via RPC', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = ObjectId.random();

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      // Append
      const block: Block = {
        actorId: feedId,
        sequence: 123, // Author sequence provided by peer
        predActorId: null,
        predSequence: null,
        position: null, // Input doesn't have position
        timestamp: Date.now(),
        data: new Uint8Array([1, 2, 3]),
      };

      const appendRes = yield* feed.append({ requestId: 'req-1', blocks: [block], spaceId });
      expect(appendRes.positions.length).toBe(1);
      expect(appendRes.positions[0]).toBeDefined();
      expect(appendRes.requestId).toBe('req-1');

      // Query by feedId
      const queryRes = yield* feed.query({ requestId: 'req-2', query: { feedIds: [feedId] }, cursor: -1, spaceId }); // Use cursor '0' to get everything
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
      const namespace = 'data';

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();

      // Append with namespace
      const block: Block = {
        actorId: ALICE,
        sequence: 1,
        predActorId: null,
        predSequence: null,
        position: null,
        timestamp: Date.now(),
        data: new Uint8Array([1]),
      };

      yield* feed.append({ requestId: 'req-ns', blocks: [block], namespace, spaceId });

      // Verify directly from DB (white-box test) to ensure schema is correct
      const sql = yield* SqliteClient.SqliteClient;
      const rows = yield* sql<{ feedNamespace: string }>`
        SELECT feedNamespace FROM feeds WHERE spaceId = ${spaceId} AND feedId = ${ALICE}
      `;
      expect(rows[0].feedNamespace).toBe(namespace);
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
          {
            actorId: feedId,
            sequence: 1,
            predActorId: null,
            predSequence: null,
            position: null,
            timestamp: Date.now(),
            data: new Uint8Array([1]),
          },
        ],
        spaceId,
      });

      // Subscribe
      const subRes = yield* feed.subscribe({ requestId: 'req-2', feedIds: [feedId], spaceId });
      expect(subRes.subscriptionId).toBeDefined();
      expect(subRes.requestId).toBe('req-2');

      // Query via Subscription
      const queryRes = yield* feed.query({
        requestId: 'req-3',
        query: { subscriptionId: subRes.subscriptionId },
        cursor: 0,
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
          feedNamespace: 'default',
          data: new Uint8Array([1]),
        },
      ]);

      yield* feedStore.appendLocal([
        {
          spaceId,
          feedId: 'feed-2',
          feedNamespace: 'default',
          data: new Uint8Array([2]),
        },
      ]);

      const result1 = yield* feedStore.query({
        requestId: 'req1',
        spaceId,
        query: { feedIds: ['feed-1'] },
        cursor: -1,
      });

      const result2 = yield* feedStore.query({
        requestId: 'req2',
        spaceId,
        query: { feedIds: ['feed-2'] },
        cursor: -1,
      });

      expect(result1.blocks[0].insertionId).toBeTypeOf('number');
      expect(result2.blocks[0].insertionId).toBeTypeOf('number');
      expect(result2.blocks[0].insertionId!).toBeGreaterThan(result1.blocks[0].insertionId!);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('queryLocal', () =>
    Effect.gen(function* () {
      const feedStore = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feedStore.migrate();

      const spaceId = SpaceId.random();

      // Append interleaving blocks
      yield* feedStore.appendLocal([
        {
          spaceId,
          feedId: 'feed-1',
          feedNamespace: 'default',
          data: new Uint8Array([1]),
        },
      ]);
      yield* feedStore.appendLocal([
        {
          spaceId,
          feedId: 'feed-2',
          feedNamespace: 'default',
          data: new Uint8Array([2]),
        },
      ]);
      yield* feedStore.appendLocal([
        {
          spaceId,
          feedId: 'feed-1',
          feedNamespace: 'default',
          data: new Uint8Array([3]),
        },
      ]);

      // Query all local
      const blocks = yield* feedStore.queryLocal({
        spaceId,
        limit: 10,
      });

      expect(blocks).toHaveLength(3);
      expect(blocks[0].insertionId).toBeLessThan(blocks[1].insertionId!);
      expect(blocks[1].insertionId).toBeLessThan(blocks[2].insertionId!);
      // Check data to confirm order
      expect(blocks[0].data[0]).toEqual(1);
      expect(blocks[1].data[0]).toEqual(2);
      expect(blocks[2].data[0]).toEqual(3);

      // Query with cursor
      const nextBlocks = yield* feedStore.queryLocal({
        spaceId,
        conversation: blocks[1].insertionId!,
      });
      expect(nextBlocks).toHaveLength(1);
      expect(nextBlocks[0].data[0]).toEqual(3);
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
          feedNamespace: 'data',
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
      const queryRes = yield* feed.query({ query: { feedIds: [feedId] }, cursor: -1, spaceId }); // Use cursor '-1' to get everything
      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.blocks[0]).toMatchObject({ ...blocks[0], position: expect.any(Number) });
    }).pipe(Effect.provide(TestLayer)),
  );
});
