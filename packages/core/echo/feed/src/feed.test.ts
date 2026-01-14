import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { Feed } from './feed';
import { Block } from './protocol';
import { SpaceId } from '@dxos/keys';

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
});

describe('Feed V2', () => {
  it.effect('should append and query blocks via RPC', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = '01H1V1X1X1X1X1X1X1X1X1X1X1';

      const feed = new Feed(spaceId);

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

      const appendRes = yield* feed.append({ requestId: 'req-1', blocks: [block] });
      expect(appendRes.positions.length).toBe(1);
      expect(appendRes.positions[0]).toBeGreaterThan(0);
      expect(appendRes.requestId).toBe('req-1');

      // Query by feedId
      const queryRes = yield* feed.query({ requestId: 'req-2', feedIds: [feedId], cursor: 0 }); // Use cursor '0' to get everything
      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.blocks[0].position).toBe(appendRes.positions[0]);
      expect(queryRes.blocks[0].sequence).toBe(123); // Verify Author Sequence is preserved
      expect(queryRes.requestId).toBe('req-2');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should use subscriptions', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = '01H1V1X1X1X1X1X1X1X1X1X1X2';

      const feed = new Feed(spaceId);

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
      });

      // Subscribe
      const subRes = yield* feed.subscribe({ requestId: 'req-2', feedIds: [feedId] });
      expect(subRes.subscriptionId).toBeDefined();
      expect(subRes.requestId).toBe('req-2');

      // Query via Subscription
      const queryRes = yield* feed.query({ requestId: 'req-3', subscriptionId: subRes.subscriptionId, cursor: 0 });
      expect(queryRes.blocks.length).toBe(1);
      expect(queryRes.requestId).toBe('req-3');
    }).pipe(Effect.provide(TestLayer)),
  );
});
