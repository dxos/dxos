import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { Feed } from './feed';
import { Block } from './protocol';
import { SpaceId } from '@dxos/keys';
import { SqlFeedStore } from './feed-sql';
import { InMemoryFeedStore } from './feed-memory';
import { FeedStore } from './feed-store';

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
});

const runTests = (
  name: string,
  createStore: (spaceId: string, feedId: string) => Effect.Effect<FeedStore, any, any>,
) => {
  describe(`Feed Persistence (${name})`, () => {
    it.effect('should open a feed and append/read blocks', () =>
      Effect.gen(function* () {
        const spaceId = SpaceId.random();
        const feedId = '01H1V1X1X1X1X1X1X1X1X1X1X1';

        const store = yield* createStore(spaceId, feedId);
        const feed = new Feed(store, spaceId, feedId);

        // Create a block
        const block: Block = {
          actorId: 'actor1',
          sequence: 0,
          predActorId: null,
          predSequence: null,
          position: 1,
          timestamp: Date.now(),
          data: new Uint8Array([1, 2, 3]),
        };

        const block2: Block = {
          actorId: 'actor1',
          sequence: 1,
          predActorId: 'actor1',
          predSequence: 0,
          position: 2,
          timestamp: Date.now(),
          data: new Uint8Array([4, 5, 6]),
        };

        // Append
        yield* feed.append([block, block2]);

        // Query
        const blocks = yield* feed.getBlocks({ after: 0, to: null });

        expect(blocks.length).toBe(2);
        expect(blocks[0].sequence).toBe(0);
        expect(blocks[1].sequence).toBe(1);
        expect(blocks[0].data).toEqual(new Uint8Array([1, 2, 3]));
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('should handle unpositioned blocks', () =>
      Effect.gen(function* () {
        const spaceId = SpaceId.random();
        const feedId = '01H1V1X1X1X1X1X1X1X1X1X1X2';

        const store = yield* createStore(spaceId, feedId);
        const feed = new Feed(store, spaceId, feedId);

        const unpositionedBlock: Block = {
          actorId: 'actor2',
          sequence: 0,
          predActorId: null,
          predSequence: null,
          position: null,
          timestamp: Date.now(),
          data: new Uint8Array([9, 9]),
        };

        yield* feed.append([unpositionedBlock]);

        // Standard query gets positioned blocks
        const positionedBlocks = yield* feed.getBlocks({ after: null, to: null });
        expect(positionedBlocks.length).toBe(0);

        // Check sync generation (should pick up unpositioned blocks)
        const syncMsg = yield* feed.generateSyncMessage();
        expect(syncMsg.blocks.length).toBe(1);
        expect(syncMsg.blocks[0].actorId).toBe('actor2');
        expect(syncMsg.blocks[0].position).toBeNull();
      }).pipe(Effect.provide(TestLayer)),
    );
  });
};

runTests('SQL', (spaceId, feedId) => Effect.succeed(new SqlFeedStore(spaceId, feedId)));
runTests('InMemory', () => Effect.succeed(new InMemoryFeedStore()));
