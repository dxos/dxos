import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { FeedStore } from './feed';
import { Block } from './protocol';
import { SpaceId } from '@dxos/keys';

describe.skip('Feed Sync V2 (RPC)', () => {
  const makePeer = () => {
    const layer = SqliteClient.layer({ filename: ':memory:' });
    const runtime = ManagedRuntime.make(layer);
    const run = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) => runtime.runPromise(effect);
    return { run };
  };

  it('should sync blocks from server to client via RPC', async () => {
    const server = makePeer();
    const client = makePeer();

    const spaceId = SpaceId.random();
    const feedId = '01H1V1X1X1X1X1X1X1X1X1X1X3';

    // Server setup: Append blocks
    await server.run(
      Effect.gen(function* () {
        const feed = new FeedStore({ localActorId: 'server', assignPositions: true });
        const blocks: Block[] = [
          {
            actorId: feedId,
            sequence: 1,
            predActorId: null,
            predSequence: null,
            position: null,
            timestamp: 100,
            data: new Uint8Array([1]),
          },
          {
            actorId: feedId,
            sequence: 2,
            predActorId: feedId,
            predSequence: 1,
            position: null,
            timestamp: 200,
            data: new Uint8Array([2]),
          },
        ];
        yield* feed.append({ requestId: 'req-0', blocks, spaceId });
      }),
    );

    // Sync Simulation: Client polls Server
    // 1. Client subscribes
    const subId = await server.run(
      Effect.gen(function* () {
        // Wait, we flattened it. Tests need to update to NOT use SqlFeedStore!
        // I will fix the class instantiation in a moment.
        const feed = new FeedStore({ localActorId: 'server', assignPositions: true });
        const res = yield* feed.subscribe({ requestId: 'req-sub', feedIds: [feedId], spaceId });
        return res.subscriptionId;
      }),
    );

    // 2. Client queries using subscription
    const blocks = await server.run(
      Effect.gen(function* () {
        const feed = new FeedStore({ localActorId: 'server', assignPositions: true }); // Updated class usage
        const res = yield* feed.query({ requestId: 'req-query', query: { subscriptionId: subId }, cursor: 0 });
        return res.blocks;
      }),
    );

    expect(blocks.length).toBe(2);
    expect(blocks[0].sequence).toBe(1);

    // 3. Client stores them (Verify client persistence)
    await client.run(
      Effect.gen(function* () {
        const feed = new FeedStore({ localActorId: 'client', assignPositions: true }); // Updated class usage
        // Client appends them.
        yield* feed.append({ requestId: 'req-push', blocks, spaceId });

        // Verify
        const myBlocks = yield* feed.query({
          requestId: 'req-verify',
          query: { feedIds: [feedId] },
          cursor: 0,
          spaceId,
        });
        expect(myBlocks.blocks.length).toBe(2);
      }),
    );
  });
});
