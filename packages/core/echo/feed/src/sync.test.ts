import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { Feed } from './feed';
import { Block } from './protocol';
import { SpaceId } from '@dxos/keys';
import { SqlFeedStore } from './feed-sql';

describe('Feed Sync (SQL)', () => {
  const makePeer = () => {
    const layer = SqliteClient.layer({ filename: ':memory:' });
    const runtime = ManagedRuntime.make(layer);
    const run = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) => runtime.runPromise(effect);
    return { run };
  };

  it('should sync from source to destination (simulated network)', async () => {
    const source = makePeer();
    const dest = makePeer();

    const spaceId = SpaceId.random();
    const feedId = '01H1V1X1X1X1X1X1X1X1X1X1X3';

    // Source setup
    await source.run(
      Effect.gen(function* () {
        const store = new SqlFeedStore(spaceId, feedId);
        const feed = new Feed(store, spaceId, feedId);

        const blocks: Block[] = [
          {
            actorId: 'a1',
            sequence: 0,
            predActorId: null,
            predSequence: null,
            position: 1,
            timestamp: 100,
            data: new Uint8Array([1]),
          },
          {
            actorId: 'a1',
            sequence: 1,
            predActorId: 'a1',
            predSequence: 0,
            position: 2,
            timestamp: 200,
            data: new Uint8Array([2]),
          },
        ];
        yield* feed.append(blocks);
      }),
    );

    // Sync exchange
    // 1. Dest generates request
    const req = await dest.run(
      Effect.gen(function* () {
        const store = new SqlFeedStore(spaceId, feedId);
        const feed = new Feed(store, spaceId, feedId);
        return yield* feed.generateSyncMessage();
      }),
    );

    // 2. Source responds
    const res = await source.run(
      Effect.gen(function* () {
        const store = new SqlFeedStore(spaceId, feedId);
        const feed = new Feed(store, spaceId, feedId);
        return yield* feed.receiveSyncMessage(req);
      }),
    );

    // 3. Dest receives response
    await dest.run(
      Effect.gen(function* () {
        const store = new SqlFeedStore(spaceId, feedId);
        const feed = new Feed(store, spaceId, feedId);
        yield* feed.receiveSyncMessage(res);

        const destBlocks = yield* feed.getBlocks({ after: null, to: null });
        expect(destBlocks.length).toBe(2);
        expect(destBlocks[0].position).toBe(1);
        expect(destBlocks[1].position).toBe(2);
      }),
    );
  });

  it('should push unpositioned blocks', async () => {
    const client = makePeer();
    const server = makePeer();

    const spaceId = SpaceId.random();
    const feedId = '01H1V1X1X1X1X1X1X1X1X1X1X4';

    // Client adds block
    await client.run(
      Effect.gen(function* () {
        const store = new SqlFeedStore(spaceId, feedId);
        const feed = new Feed(store, spaceId, feedId);
        const block: Block = {
          actorId: 'c1',
          sequence: 0,
          predActorId: null,
          predSequence: null,
          position: null,
          timestamp: 100,
          data: new Uint8Array([0]),
        };
        yield* feed.append([block]);
      }),
    );

    // Client -> Server
    const clientMsg = await client.run(
      Effect.gen(function* () {
        const store = new SqlFeedStore(spaceId, feedId);
        const feed = new Feed(store, spaceId, feedId);
        return yield* feed.generateSyncMessage();
      }),
    );

    expect(clientMsg.blocks.length).toBe(1);

    // Server receives
    await server.run(
      Effect.gen(function* () {
        const store = new SqlFeedStore(spaceId, feedId);
        const feed = new Feed(store, spaceId, feedId);
        yield* feed.receiveSyncMessage(clientMsg);

        // Server back to Client
        const serverMsg = yield* feed.generateSyncMessage();
        expect(serverMsg.blocks.length).toBe(1);
        expect(serverMsg.blocks[0].actorId).toBe('c1');
      }),
    );
  });
});
