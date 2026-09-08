//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from '@effect/vitest';

import { RuntimeProvider } from '@dxos/effect';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { range } from '@dxos/util';

import { TestBuilder, type TestPeer } from './testing';

const WellKnownNamespaces = FeedProtocol.WellKnownNamespaces;

describe('Sync', () => {
  const LOG_SQL = false;

  const spaceId = SpaceId.random();
  const feedId = EntityId.random();

  test('pull blocks from server', async () => {
    await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
    const [server, client] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await server.feedStore
      .appendLocal(
        testBlocks.map((block) => ({
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: block,
        })),
      )
      .pipe(RuntimeProvider.runPromise(server.runtime.contextEffect));

    await builder.pull(client);

    const { blocks } = await client.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.contextEffect));
    expect(blocks.map((block) => block.data)).toEqual(testBlocks);
  });

  test('push blocks from client to server', async () => {
    await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
    const [server, client] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client.feedStore
      .appendLocal(
        testBlocks.map((block) => ({
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: block,
        })),
      )
      .pipe(RuntimeProvider.runPromise(client.runtime.contextEffect));

    await builder.push(client);

    const serverBlocks = await server.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(server.runtime.contextEffect));
    expect(serverBlocks.blocks.map((block) => block.data)).toEqual(testBlocks);
    expect(serverBlocks.blocks.every((block) => block.position != null)).toBe(true);

    const clientBlocks = await client.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.contextEffect));
    expect(clientBlocks.blocks.map((block) => block.position)).toEqual(
      serverBlocks.blocks.map((block) => block.position),
    );
  });

  test('push blocks incrementally in batches', async () => {
    await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
    const [server, client] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client.feedStore
      .appendLocal(
        testBlocks.map((block) => ({
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: block,
        })),
      )
      .pipe(RuntimeProvider.runPromise(client.runtime.contextEffect));

    let done = false,
      numBatches = 0;
    while (!done) {
      numBatches++;
      const result = await builder.push(client, { limit: 2 });
      done = result.done;
    }
    await builder.push(client);
    expect(numBatches).toBeGreaterThan(2);
    expect(numBatches).toBeLessThan(10);

    const serverBlocks = await server.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(server.runtime.contextEffect));
    expect(serverBlocks.blocks.map((block) => block.data)).toEqual(testBlocks);
    expect(serverBlocks.blocks.every((block) => block.position != null)).toBe(true);

    const clientBlocks = await client.feedStore
      .query({
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.contextEffect));
    expect(clientBlocks.blocks.map((block) => block.position)).toEqual(
      serverBlocks.blocks.map((block) => block.position),
    );
  });

  test('3-way sync', async () => {
    await using builder = await new TestBuilder({ numPeers: 3, spaceId, logSql: LOG_SQL }).open();
    const [, client1, client2] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client1.feedStore
      .appendLocal(
        testBlocks.map((block) => ({ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: block })),
      )
      .pipe(RuntimeProvider.runPromise(client1.runtime.contextEffect));
    await builder.push(client1);

    await builder.pull(client2);

    const { blocks: client1Blocks } = await client1.feedStore
      .query({ spaceId, feedNamespace: WellKnownNamespaces.data })
      .pipe(RuntimeProvider.runPromise(client1.runtime.contextEffect));
    const { blocks: client2Blocks } = await client2.feedStore
      .query({ spaceId, feedNamespace: WellKnownNamespaces.data })
      .pipe(RuntimeProvider.runPromise(client2.runtime.contextEffect));
    expect(client1Blocks).toEqual(client2Blocks);
    expect(client1Blocks.every((block) => block.position != null)).toBe(true);
  });

  describe('server replacement', () => {
    test('records the server token on first pull without disturbing positions', async () => {
      await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
      const [server, client] = builder.peers;

      await seedBlocks(server, generateTestBlocks(0, 5));
      await builder.pull(client);

      const serverToken = await server.getServerToken(spaceId);
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: 4,
        serverToken,
      });

      const positions = await blockPositions(client);
      expect(positions).toEqual([0, 1, 2, 3, 4]);

      // Same server: nothing to re-sync.
      await builder.pull(client);
      expect(await blockPositions(client)).toEqual(positions);
    });

    test('re-syncs from scratch when the server is wiped', async () => {
      await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
      const [server, client] = builder.peers;

      const testBlocks = generateTestBlocks(0, 5);
      await seedBlocks(client, testBlocks);
      await builder.push(client);
      await builder.pull(client);
      const staleToken = await server.getServerToken(spaceId);
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);

      const replacement = await builder.replaceServer();
      const freshToken = await replacement.getServerToken(spaceId);
      expect(freshToken).not.toEqual(staleToken);

      // The pull detects the swap and drops every position the old server assigned.
      await builder.pull(client);
      expect(await blockPositions(client)).toEqual([null, null, null, null, null]);
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: -1,
        serverToken: freshToken,
      });

      // Blocks survived the reset and are re-pushed to the new server.
      await builder.push(client);
      const { blocks: serverBlocks } = await replacement.query({ spaceId, feedNamespace: WellKnownNamespaces.data });
      expect(serverBlocks.map((block) => block.data)).toEqual(testBlocks);
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);
    });

    // Sync state written before servers reported a token carries progress but no token. Its server
    // may already have been replaced, so the first token a client sees cannot be trusted to
    // describe the ordering that progress came from.
    test('replays the namespace when adopting a token over untokened progress', async () => {
      await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
      const [server, client] = builder.peers;

      await seedBlocks(server, generateTestBlocks(0, 5));
      await builder.pull(client);
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);
      await client.setSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data, lastPulledPosition: 2 });
      await client.clearServerToken({ spaceId, feedNamespace: WellKnownNamespaces.data });

      // The replacement holds a different feed, so anything below the stale position that the
      // client fails to replay is data it never sees.
      const replacementFeedId = EntityId.random();
      const replacement = await builder.replaceServer();
      await seedBlocks(replacement, generateTestBlocks(10, 8), replacementFeedId);

      // The batch this pull received was served from the stale position, so it is discarded.
      expect(await builder.pull(client)).toEqual({ done: false });
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: -1,
        serverToken: await replacement.getServerToken(spaceId),
      });

      // Replaying now reaches every block, including those below the stale position.
      let done = false;
      while (!done) {
        ({ done } = await builder.pull(client));
      }
      expect(await blockPositions(client, replacementFeedId)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    test('does not duplicate blocks pulled from a replacement server', async () => {
      await using builder = await new TestBuilder({ numPeers: 3, spaceId, logSql: LOG_SQL }).open();
      const [, client1, client2] = builder.peers;

      const testBlocks = generateTestBlocks(0, 5);
      await seedBlocks(client1, testBlocks);
      await builder.push(client1);
      await builder.pull(client2);
      expect(await blockPositions(client2)).toEqual([0, 1, 2, 3, 4]);

      // The replacement re-assigns positions for the same blocks, republished by their author.
      const replacement = await builder.replaceServer();
      // The author notices the swap on pull, which strips its stale positions, and re-pushes.
      await builder.pull(client1);
      await builder.push(client1);

      // client2 already holds every block by (actorId, sequence): the resync repositions them
      // rather than inserting copies.
      await builder.pull(client2);
      const { blocks } = await client2.query({ spaceId, feedNamespace: WellKnownNamespaces.data });
      expect(blocks.map((block) => block.data)).toEqual(testBlocks);
      const { blocks: serverBlocks } = await replacement.query({ spaceId, feedNamespace: WellKnownNamespaces.data });
      expect(blocks.map((block) => block.position)).toEqual(serverBlocks.map((block) => block.position));
    });
  });

  const seedBlocks = (peer: TestPeer, blocks: Uint8Array[], feed = feedId) =>
    peer.appendLocal(blocks.map((data) => ({ spaceId, feedId: feed, feedNamespace: WellKnownNamespaces.data, data })));

  const blockPositions = async (peer: TestPeer, feed?: string) => {
    const { blocks } = await peer.query({
      spaceId,
      feedNamespace: WellKnownNamespaces.data,
      ...(feed != null ? { query: { feedIds: [feed] } } : {}),
    });
    return blocks.map((block) => block.position);
  };
});

const generateTestBlocks = (start: number, count: number) => range(count, (i) => new Uint8Array([start + i]));
