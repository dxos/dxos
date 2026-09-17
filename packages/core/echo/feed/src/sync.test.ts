//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from '@effect/vitest';

import { RuntimeProvider } from '@dxos/effect';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { range } from '@dxos/util';

import { TestBuilder, type TestPeer } from './testing/index.ts';

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
        blocksToPull: 0,
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
        blocksToPull: 0,
      });

      // Blocks survived the reset and are re-pushed to the new server.
      await builder.push(client);
      const { blocks: serverBlocks } = await replacement.query({ spaceId, feedNamespace: WellKnownNamespaces.data });
      expect(serverBlocks.map((block) => block.data)).toEqual(testBlocks);
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);
    });

    // Sync state written before servers reported a token carries progress but no token. Adopting
    // the first token must not wipe that progress (every client would re-sync everything the day
    // tokens appear), yet a server replaced in the meantime must still be caught: the cursor steps
    // back one slot, so the next pull re-fetches the block it was pulled from and a different block
    // there replays the namespace.
    test('verifies a first token over untokened progress by re-fetching the block at the cursor', async () => {
      await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
      const [server, client] = builder.peers;

      await seedBlocks(server, generateTestBlocks(0, 5));
      await builder.pull(client);
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);
      await client.setSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data, lastPulledPosition: 2 });
      await client.clearServerToken({ spaceId, feedNamespace: WellKnownNamespaces.data });

      // Same server: the token is recorded, the batch discarded and the cursor stepped back.
      expect(await builder.pull(client)).toEqual({ done: false });
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: 1,
        serverToken: await server.getServerToken(spaceId),
        blocksToPull: 0,
      });
      // The re-fetched block at 2 is the one already held, so progress simply resumes.
      expect(await builder.pull(client)).toEqual({ done: false });
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: 4,
        serverToken: await server.getServerToken(spaceId),
        blocksToPull: 0,
      });
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);
      await client.setSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data, lastPulledPosition: 2 });
      await client.clearServerToken({ spaceId, feedNamespace: WellKnownNamespaces.data });

      // The replacement holds a different feed, so anything below the stale position that the
      // client fails to replay is data it never sees.
      const replacementFeedId = EntityId.random();
      const replacement = await builder.replaceServer();
      await seedBlocks(replacement, generateTestBlocks(10, 8), replacementFeedId);

      expect(await builder.pull(client)).toEqual({ done: false });
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: 1,
        serverToken: await replacement.getServerToken(spaceId),
        blocksToPull: 0,
      });
      // The re-fetched block at 2 is the replacement's, which displaces the old server's and
      // replays the namespace.
      expect(await builder.pull(client)).toEqual({ done: false });
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: -1,
        serverToken: await replacement.getServerToken(spaceId),
        blocksToPull: 0,
      });

      let done = false;
      while (!done) {
        ({ done } = await builder.pull(client));
      }
      expect(await blockPositions(client, replacementFeedId)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      // The old server's blocks lost their slots to the replacement's and await a push.
      expect(await blockPositions(client, feedId)).toEqual([null, null, null, null, null]);
    });

    // The replacement's blocks above the cursor collide with nothing the client holds, so only the
    // re-fetched block at the cursor can reveal the swap; without it the client would keep the old
    // server's blocks positioned and never pull the replacement's below its cursor.
    test('catches a replacement server whose blocks above an untokened cursor collide with nothing', async () => {
      await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
      const [server, client] = builder.peers;

      await seedBlocks(server, generateTestBlocks(0, 5));
      await builder.pull(client);
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);
      await client.clearServerToken({ spaceId, feedNamespace: WellKnownNamespaces.data });

      const replacementFeedId = EntityId.random();
      const replacement = await builder.replaceServer();
      await seedBlocks(replacement, generateTestBlocks(10, 11), replacementFeedId);

      let done = false;
      while (!done) {
        ({ done } = await builder.pull(client));
      }
      expect(await blockPositions(client, replacementFeedId)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(await blockPositions(client, feedId)).toEqual([null, null, null, null, null]);
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: 10,
        serverToken: await replacement.getServerToken(spaceId),
        blocksToPull: 0,
      });
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

  // A server whose storage was rolled back keeps its token, so the token check never fires; what
  // gives it away is that it re-issues positions this client already holds.
  describe('server rollback', () => {
    test('recovers when the server drops acknowledged blocks and re-issues their positions', async () => {
      await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
      const [server, client] = builder.peers;

      await seedBlocks(client, generateTestBlocks(0, 5));
      await builder.push(client);
      await builder.pull(client);
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);

      await server.dropBlocksFromPosition({ spaceId, feedNamespace: WellKnownNamespaces.data, position: 2 });
      const serverFeedId = EntityId.random();
      await seedBlocks(server, generateTestBlocks(10, 1), serverFeedId);
      await seedBlocks(client, generateTestBlocks(20, 1));

      // Before the fix the push's position collided with the client's stale block at the same
      // position and failed the same way on every retry.
      await syncUntilDone(builder, client);

      const serverBlocks = await placements(server);
      expect(serverBlocks).toHaveLength(7);
      expect(await placements(client)).toEqual(serverBlocks);
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: 6,
        serverToken: await server.getServerToken(spaceId),
        blocksToPull: 0,
      });
    });

    test('a reader whose cursor is beyond the server replays and sees what the server wrote since', async () => {
      await using builder = await new TestBuilder({ numPeers: 2, spaceId, logSql: LOG_SQL }).open();
      const [server, client] = builder.peers;

      await seedBlocks(server, generateTestBlocks(0, 5));
      await builder.pull(client);
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);

      await server.dropBlocksFromPosition({ spaceId, feedNamespace: WellKnownNamespaces.data, position: 2 });
      const laterFeedId = EntityId.random();
      await seedBlocks(server, generateTestBlocks(10, 2), laterFeedId);

      // The cursor sits at 4 while the server's high-water mark is 3: nothing above the cursor will
      // ever arrive, and the two later blocks sit below it.
      let done = false;
      while (!done) {
        ({ done } = await builder.pull(client));
      }

      expect(await blockPositions(client, laterFeedId)).toEqual([2, 3]);
      // The dropped blocks are unpositioned again: two lost their slots to the later blocks, the
      // third sat above the server's high-water mark.
      expect(await blockPositions(client, feedId)).toEqual([0, 1, null, null, null]);
      expect(await client.getSyncState({ spaceId, feedNamespace: WellKnownNamespaces.data })).toEqual({
        lastPulledPosition: 3,
        serverToken: await server.getServerToken(spaceId),
        blocksToPull: 0,
      });
    });

    // The first push after a rollback regrows the server, so a client that pulls later finds the
    // high-water mark back at its cursor and nothing above it: only the block at the cursor itself
    // can reveal that the ordering below it is stale, and that its own blocks are gone.
    test('a client the server has regrown to its cursor replays and re-pushes what the server lost', async () => {
      await using builder = await new TestBuilder({ numPeers: 3, spaceId, logSql: LOG_SQL }).open();
      const [server, client, writer] = builder.peers;

      await seedBlocks(client, generateTestBlocks(0, 5));
      await builder.push(client);
      await builder.pull(client);
      expect(await blockPositions(client)).toEqual([0, 1, 2, 3, 4]);

      await server.dropBlocksFromPosition({ spaceId, feedNamespace: WellKnownNamespaces.data, position: 2 });
      const writerFeedId = EntityId.random();
      await seedBlocks(writer, generateTestBlocks(10, 3), writerFeedId);
      await builder.push(writer);
      expect(await blockPositions(server, writerFeedId)).toEqual([2, 3, 4]);

      await syncUntilDone(builder, client);

      // The writer's blocks kept 2..4; the client's lost blocks were pushed again behind them.
      expect(await blockPositions(client, writerFeedId)).toEqual([2, 3, 4]);
      expect(await blockPositions(client, feedId)).toEqual([0, 1, 5, 6, 7]);
      expect(await placements(client)).toEqual(await placements(server));
    });

    // A server that predates `cursorBlock` is caught the moment it re-issues, above the cursor, a
    // position for a block this client already holds: the slot it lands in is empty here, so the
    // block's own move is the only trace of the rollback.
    test('replays when a server that does not report the cursor block moves a held block above the cursor', async () => {
      await using builder = await new TestBuilder({
        numPeers: 3,
        spaceId,
        logSql: LOG_SQL,
        mapServerReply: (message) =>
          message._tag === 'QueryResponse' ? { ...message, cursorBlock: undefined } : message,
      }).open();
      const [server, client, other] = builder.peers;

      await seedBlocks(client, generateTestBlocks(0, 5));
      await builder.push(client);
      await builder.pull(client);
      await builder.pull(other);
      expect(await blockPositions(other)).toEqual([0, 1, 2, 3, 4]);

      // The other client's push takes the lost slots, which displaces its copies of the client's
      // blocks, and its replay pushes those back behind its own.
      await server.dropBlocksFromPosition({ spaceId, feedNamespace: WellKnownNamespaces.data, position: 2 });
      const otherFeedId = EntityId.random();
      await seedBlocks(other, generateTestBlocks(10, 3), otherFeedId);
      await builder.push(other);
      await syncUntilDone(builder, other);
      expect(await blockPositions(server, otherFeedId)).toEqual([2, 3, 4]);
      expect(await blockPositions(server, feedId)).toEqual([0, 1, 5, 6, 7]);

      // The client's cursor is 4 and the server's mark is 7, so the pull only sees its own blocks
      // arriving at 5..7 -- a move from 2..4, which is what makes it replay and pull 2..4 anew.
      await syncUntilDone(builder, client);
      expect(await blockPositions(client, otherFeedId)).toEqual([2, 3, 4]);
      expect(await blockPositions(client, feedId)).toEqual([0, 1, 5, 6, 7]);
      expect(await placements(client)).toEqual(await placements(server));
    });
  });

  const syncUntilDone = async (builder: TestBuilder, client: TestPeer) => {
    for (let round = 0; round < 20; round++) {
      const pulled = await builder.pull(client);
      const pushed = await builder.push(client);
      if (pulled.done && pushed.done) {
        return;
      }
    }
    throw new Error('sync did not converge');
  };

  /** Every positioned block as `[actorId, sequence, position]`, in position order. */
  const placements = async (peer: TestPeer) => {
    const { blocks } = await peer.query({ spaceId, feedNamespace: WellKnownNamespaces.data });
    return blocks
      .filter((block) => block.position != null)
      .map((block) => [block.actorId, block.sequence, block.position]);
  };

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
