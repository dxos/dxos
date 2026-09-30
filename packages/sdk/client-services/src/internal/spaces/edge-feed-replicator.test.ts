//
// Copyright 2022 DXOS.org
//

import { decode as decodeCbor, encode as encodeCbor } from 'cbor-x';
import { getPort } from 'get-port-please';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Event, Trigger, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { EdgeClient, EdgeIdentityChangedError, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { HypercoreFactory, HypercoreStore, type HypercoreWrapper } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { Keyring } from '@dxos/keyring';
import { type PublicKey, SpaceId } from '@dxos/keys';
import { createBuf, fromTimeframe } from '@dxos/protocols/buf';
import { EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type FeedMessage, FeedMessageSchema } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import { type Message } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { type FeedBlock, type ProtocolMessage } from '@dxos/protocols/feed-replication';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { openAndClose } from '@dxos/test-utils';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { EdgeFeedReplicator } from '../../Replication.ts';
import { valueEncoding } from '../pipeline/index.ts';

describe('EdgeFeedReplicator', () => {
  test('requests metadata after connection is open', async () => {
    const { endpoint, admitConnection, messageSink } = await createEdge();
    const { messenger, sendSpy } = await createClient(endpoint);

    await attachReplicator(messenger);

    await sleep(50);

    expect(sendSpy).not.toHaveBeenCalled();
    expect(messageSink.length).toEqual(0);

    admitConnection.wake();
    await expect.poll(() => sendSpy.mock.calls.length).toEqual(1);
    expect(messageSink.length).toEqual(1);
    expect(messageSink[0].type).toEqual('get-metadata');
  });

  test('replicates if added to a connected client', async () => {
    const { endpoint, admitConnection, messageSink } = await createEdge();
    const { messenger } = await createClient(endpoint);
    admitConnection.wake();
    await expect.poll(() => messenger.status.state).toBe(EdgeStatus_ConnectionState.CONNECTED);

    await attachReplicator(messenger);
    await expect.poll(() => messageSink.length).toEqual(1);
  });

  test('sends a block', async () => {
    const { endpoint, admitConnection, messageSink } = await createEdge();
    const { messenger } = await createClient(endpoint);

    const { feed } = await attachReplicator(messenger);

    admitConnection.wake();
    await feed.append(createBuf(FeedMessageSchema, { timeframe: fromTimeframe(new Timeframe()) }));

    await expect.poll(() => messageSink.length).toEqual(2);
    expect(messageSink[1].type).toEqual('data');
  });

  test('re-requests metadata on reconnect', async () => {
    const { endpoint, admitConnection, messageSink } = await createEdge();
    const { messenger, reconnectTrigger } = await createClient(endpoint);

    await attachReplicator(messenger);

    admitConnection.wake();
    await expect.poll(() => messageSink.length).toEqual(1);

    reconnectTrigger.reset();
    await updateIdentity(messenger);
    await reconnectTrigger.wait();

    await expect.poll(() => messageSink.length).toEqual(2);
    expect(messageSink[1].type).toEqual('get-metadata');
  });

  test('recovers after query sending failure during identity change', async () => {
    const { endpoint, admitConnection, messageSink } = await createEdge();
    const { messenger, sendSpy } = await createClient(endpoint);

    await attachReplicator(messenger);

    sendSpy.mockImplementationOnce(() => {
      throw new EdgeIdentityChangedError(); // Hard to mock the exact race condition for when this error is thrown
    });
    admitConnection.wake();

    await expect.poll(() => sendSpy.mock.calls.length).toEqual(1);
    expect(messageSink.length).toEqual(0);
    await updateIdentity(messenger);

    await expect.poll(() => messageSink.length).toEqual(1);
    expect(messageSink[0].type).toEqual('get-metadata');
  });

  test('recovers after response sending failure during identity change', async () => {
    const { endpoint, admitConnection, messageSink, sendResponseMessage } = await createEdge();
    const { messenger, sendSpy, reconnectTrigger } = await createClient(endpoint);

    const { feed } = await attachReplicator(messenger);
    await feed.append(createBuf(FeedMessageSchema, { timeframe: fromTimeframe(new Timeframe()) }));

    sendSpy.mockImplementationOnce(async (_ctx: any, request: any) => {
      sendResponseMessage(request, encodeCbor({ type: 'metadata', feedKey: feed.key.toHex(), length: 0 }));
      return Promise.resolve();
    });
    sendSpy.mockImplementationOnce(async () => {
      throw new EdgeIdentityChangedError();
    });
    admitConnection.wake();

    await expect.poll(() => sendSpy.mock.calls.length).toEqual(2);
    sendSpy.mockRestore();
    expect(messageSink.length).toEqual(0);

    reconnectTrigger.reset();
    await updateIdentity(messenger);
    await reconnectTrigger.wait();

    await expect.poll(() => messageSink.find((msg) => msg.type === 'data')).toBeDefined();
  });

  test('propagates errors unrelated to reconnect', async () => {
    const { endpoint, admitConnection } = await createEdge();
    const { messenger, sendSpy } = await createClient(endpoint);

    const { replicator } = await attachReplicator(messenger, { skipOpen: true });
    const raised = new Trigger();
    await replicator.open(new Context({ onError: () => raised.wake() }));
    onTestFinished(async () => {
      await replicator.close();
    });

    sendSpy.mockImplementationOnce(() => {
      throw new Error();
    });
    admitConnection.wake();

    await raised.wait();
  });

  test('identity update before connected', async () => {
    const { endpoint, admitConnection, messageSink } = await createEdge();
    const { messenger } = await createClient(endpoint);

    await attachReplicator(messenger);
    await updateIdentity(messenger);
    await sleep(100);
    admitConnection.wake();

    await expect.poll(() => messageSink.length).toEqual(1);
    expect(messageSink.map((m) => m.type)).toStrictEqual(range(1, () => 'get-metadata'));
  });

  test('block appended during reconnect', async () => {
    const { endpoint, admitConnection, feedLength } = await createEdge();
    const { messenger } = await createClient(endpoint);

    const { feed } = await attachReplicator(messenger);
    admitConnection.wake();
    await sleep(10);

    admitConnection.reset();
    await updateIdentity(messenger);
    await feed.append(createBuf(FeedMessageSchema, { timeframe: fromTimeframe(new Timeframe()) }));
    await sleep(20);
    admitConnection.wake();

    await expect.poll(() => feedLength()).toEqual(1);
  });

  test('reconnect during block append', async () => {
    const { endpoint, admitConnection, feedLength } = await createEdge();
    const { messenger } = await createClient(endpoint);

    const { feed } = await attachReplicator(messenger);
    admitConnection.wake();
    await sleep(10);

    void feed.append(createBuf(FeedMessageSchema, { timeframe: fromTimeframe(new Timeframe()) }));
    await updateIdentity(messenger);

    await expect.poll(() => feedLength()).toEqual(1);
  });

  describe('gaps in a replica', () => {
    type BlockRange = { from: number; to: number };

    /** A source feed of `length` blocks and an empty sparse replica of it. */
    const setupFeeds = async (length: number) => {
      const source = await createNewFeed();
      const replica = await openReplica(source.key);
      const append = () => source.append(createBuf(FeedMessageSchema, { timeframe: fromTimeframe(new Timeframe()) }));
      const blockAt = async (index: number): Promise<FeedBlock> => {
        const data = await source.get(index, { valueEncoding: 'binary' });
        const proof = await source.proof(index);
        return { index, data, nodes: proof.nodes, signature: proof.signature };
      };
      for (const _ of range(length)) {
        await append();
      }
      return {
        replica,
        append,
        /** Stores blocks in the replica directly, as a previous connection would have. */
        store: async (indices: number[]) => {
          for (const index of indices) {
            const data = await source.get(index, { valueEncoding: 'binary' });
            await replica.putBuffer(index, Buffer.from(data), await source.proof(index), null);
          }
        },
        feedKey: source.key.toHex(),
        blockAt,
        blocksIn: ({ from, to }: BlockRange) => Promise.all(range(to - from, (offset) => blockAt(from + offset))),
        // `get` on a sparse feed resolves when the block arrives, so this awaits delivery rather than polling;
        // a test ends on it so no reply is still reading the source when its storage closes.
        holds: (indices: number[]) => Promise.all(indices.map((index) => replica.get(index))),
      };
    };

    /**
     * An EDGE whose replies the test scripts. Every message the client sends is queued, so a test awaits the
     * next one instead of polling for state.
     */
    const createScriptedEdge = async (reply: (message: ProtocolMessage) => Promise<ProtocolMessage | undefined>) => {
      const received: ProtocolMessage[] = [];
      const arrived = new Event();
      let cursor = 0;
      let address: Message | undefined;
      const port = await getPort({ host: 'localhost', port: 7300, portRange: [7300, 7499] });
      const admitConnection = new Trigger();
      const { cleanup, endpoint, sendResponseMessage } = await createTestEdgeWsServer(port, {
        admitConnection,
        payloadDecoder: decodeCbor,
        messageHandler: async (message: ProtocolMessage, request) => {
          address = request;
          received.push(message);
          arrived.emit();
          const response = await reply(message);
          return response && encodeCbor(response);
        },
      });
      onTestFinished(cleanup);

      return {
        endpoint,
        admitConnection,
        received,
        /** The next message the client sends. */
        next: async (): Promise<ProtocolMessage> => {
          while (cursor === received.length) {
            await arrived.waitForCount(1);
          }
          return received[cursor++];
        },
        /** Sends a message unprompted, as EDGE does when it broadcasts a feed's new blocks. */
        send: (message: ProtocolMessage) => {
          invariant(address, 'the client has not sent anything to reply to');
          sendResponseMessage(address, encodeCbor(message));
        },
      };
    };

    const startReplicator = async (endpoint: string, replica: HypercoreWrapper<any>, admitConnection: Trigger) => {
      const { messenger } = await createClient(endpoint);
      const replicator = new EdgeFeedReplicator({ messenger, spaceId: SpaceId.random() });
      await replicator.addHypercore(replica);
      await openAndClose(replicator);
      admitConnection.wake();
      return { messenger };
    };

    // A sparse push moves `feed.length` past a hole that a length comparison cannot see.
    test('fetches the blocks below a block pushed ahead of the metadata reply', async () => {
      const { replica, feedKey, blockAt, blocksIn, holds } = await setupFeeds(3);
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          // The push lands before the reply, as a broadcast racing the joiner's handshake does.
          edge.send({ type: 'data', feedKey, blocks: [await blockAt(2)] });
          await holds([2]);
          return { type: 'metadata', feedKey, length: 3 };
        }
        if (message.type === 'request') {
          return { type: 'data', feedKey, blocks: await blocksIn(message.range) };
        }
      });
      await startReplicator(edge.endpoint, replica, edge.admitConnection);

      await holds([0, 1, 2]);
    });

    test('requests the gap below a block pushed after the metadata reply', async () => {
      const { replica, feedKey, blockAt, blocksIn, holds } = await setupFeeds(5);
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          return { type: 'metadata', feedKey, length: 2 };
        }
        if (message.type === 'request') {
          return { type: 'data', feedKey, blocks: await blocksIn(message.range) };
        }
      });
      await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 0, to: 2 } });
      await holds([0, 1]);

      edge.send({ type: 'data', feedKey, blocks: [await blockAt(4)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 2, to: 5 } });
      await holds([2, 3, 4]);
    });

    test('does not request blocks it already holds or has requested', async () => {
      const { replica, feedKey, blockAt, blocksIn, holds } = await setupFeeds(7);
      let requests = 0;
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          return { type: 'metadata', feedKey, length: 3 };
        }
        if (message.type === 'request') {
          if (++requests === 1) {
            // Blocks broadcast while the first request is still unanswered, as a busy feed does.
            for (const index of [3, 4]) {
              edge.send({ type: 'data', feedKey, blocks: [await blockAt(index)] });
            }
            await holds([3, 4]);
          }
          return { type: 'data', feedKey, blocks: await blocksIn(message.range) };
        }
      });
      await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 0, to: 3 } });
      await holds([0, 1, 2]);

      // The next request is the one this push causes: nothing was requested for the pushed blocks 3 and 4.
      edge.send({ type: 'data', feedKey, blocks: [await blockAt(6)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 5, to: 7 } });
      await holds([5, 6]);
    });

    test('does not repeat a request still in flight when the metadata reply arrives', async () => {
      const { replica, feedKey, blockAt, holds } = await setupFeeds(11);
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          edge.send({ type: 'data', feedKey, blocks: [await blockAt(7)] });
          await holds([7]);
          // A reply computed before block 7 was written, then the next broadcast right behind it.
          const next = await blockAt(10);
          edge.send({ type: 'metadata', feedKey, length: 6 });
          edge.send({ type: 'data', feedKey, blocks: [next] });
        }
        // Requests stay unanswered, so every one the client sends is still in flight.
        return undefined;
      });
      await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 0, to: 8 } });
      // The metadata reply adds nothing: the next request is the gap below the block pushed behind it.
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 8, to: 11 } });
    });

    test('does not request again after a complete reply in any order', async () => {
      const { replica, feedKey, blockAt, blocksIn, holds } = await setupFeeds(6);
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          return { type: 'metadata', feedKey, length: 3 };
        }
        if (message.type === 'request') {
          // EDGE collects a reply's blocks concurrently, so their order is arbitrary.
          return { type: 'data', feedKey, blocks: (await blocksIn(message.range)).reverse() };
        }
      });
      await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 0, to: 3 } });
      await holds([0, 1, 2]);

      edge.send({ type: 'data', feedKey, blocks: [await blockAt(5)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 3, to: 6 } });
      await holds([3, 4, 5]);
    });

    test('recovers blocks left out of a reply on the next connection, without re-requesting them before', async () => {
      const { replica, feedKey, blockAt, blocksIn, holds } = await setupFeeds(5);
      let metadataReplies = 0;
      let requests = 0;
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          return { type: 'metadata', feedKey, length: ++metadataReplies === 1 ? 3 : 5 };
        }
        if (message.type === 'request') {
          const blocks = await blocksIn(message.range);
          // EDGE leaves out blocks it cannot find: block 1 of the first reply.
          return {
            type: 'data',
            feedKey,
            blocks: requests++ === 0 ? blocks.filter(({ index }) => index !== 1) : blocks,
          };
        }
      });
      const { messenger } = await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 0, to: 3 } });
      await holds([0, 2]);

      // Within the connection an omitted block is not asked for again, or a missing block would loop.
      edge.send({ type: 'data', feedKey, blocks: [await blockAt(4)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 3, to: 5 } });
      await holds([3, 4]);

      await updateIdentity(messenger);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 1, to: 5 } });
      await holds([1]);
    });

    test('an empty reply leaves the requested range to the next connection', async () => {
      const { replica, feedKey, blockAt, blocksIn, holds } = await setupFeeds(5);
      let requests = 0;
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          return { type: 'metadata', feedKey, length: 3 };
        }
        if (message.type === 'request') {
          return { type: 'data', feedKey, blocks: requests++ === 0 ? [] : await blocksIn(message.range) };
        }
      });
      await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 0, to: 3 } });

      edge.send({ type: 'data', feedKey, blocks: [await blockAt(4)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 3, to: 5 } });
      await holds([3, 4]);
    });

    test('a hole above the remote length does not block the feed', async () => {
      const { replica, feedKey, blockAt, blocksIn, holds } = await setupFeeds(5);
      let metadataReplies = 0;
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          return { type: 'metadata', feedKey, length: ++metadataReplies === 1 ? 2 : 5 };
        }
        if (message.type === 'request' && (message.range.from === 0 || metadataReplies > 1)) {
          return { type: 'data', feedKey, blocks: await blocksIn(message.range) };
        }
        // The gap request on the first connection stays unanswered, so the hole persists.
        return undefined;
      });
      const { messenger } = await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 0, to: 2 } });
      await holds([0, 1]);

      // Block 4 lands above EDGE's reported length with 2 and 3 missing; its `append` must not start a
      // push that waits on block 2, holding the feed's lock that the next metadata reply needs.
      edge.send({ type: 'data', feedKey, blocks: [await blockAt(4)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 2, to: 5 } });

      await updateIdentity(messenger);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 2, to: 5 } });
      await holds([2, 3]);
    });

    test('does not send blocks EDGE pushed back to EDGE', async () => {
      const { replica, append, feedKey, blockAt, blocksIn, holds } = await setupFeeds(3);
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          return { type: 'metadata', feedKey, length: 3 };
        }
        if (message.type === 'request') {
          return { type: 'data', feedKey, blocks: await blocksIn(message.range) };
        }
      });
      await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 0, to: 3 } });
      await holds([0, 1, 2]);

      // A block written after the replica caught up extends it with no hole, so its `append` finds a range to push.
      await append();
      edge.send({ type: 'data', feedKey, blocks: [await blockAt(3)] });
      await holds([3]);
      await append();
      await append();
      edge.send({ type: 'data', feedKey, blocks: [await blockAt(5)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 4, to: 6 } });
      await holds([4, 5]);
    });

    test('does not send pushed blocks back when a metadata reply behind them arrives', async () => {
      const { replica, append, feedKey, blockAt, blocksIn, holds } = await setupFeeds(4);
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          edge.send({ type: 'data', feedKey, blocks: await blocksIn({ from: 0, to: 4 }) });
          await holds([0, 1, 2, 3]);
          // Computed before block 3 was written, so it reports less than EDGE has already sent.
          return { type: 'metadata', feedKey, length: 3 };
        }
        if (message.type === 'request') {
          return { type: 'data', feedKey, blocks: await blocksIn(message.range) };
        }
      });
      await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });

      await append();
      await append();
      edge.send({ type: 'data', feedKey, blocks: [await blockAt(5)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 4, to: 6 } });
      await holds([4, 5]);
    });

    test('a caught-up feed is not rescanned from its first block on every push', async () => {
      const { replica, append, feedKey, blockAt, blocksIn, holds } = await setupFeeds(48);
      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          return { type: 'metadata', feedKey, length: 48 };
        }
        if (message.type === 'request') {
          return { type: 'data', feedKey, blocks: await blocksIn(message.range) };
        }
      });
      const { messenger } = await startReplicator(edge.endpoint, replica, edge.admitConnection);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 0, to: 48 } });
      await holds(range(48));

      // Caught up on the new connection, so its metadata reply requests nothing.
      const has = vi.spyOn(replica, 'has');
      await updateIdentity(messenger);
      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      for (const _ of range(3)) {
        await append();
      }
      edge.send({ type: 'data', feedKey, blocks: [await blockAt(48)] });
      edge.send({ type: 'data', feedKey, blocks: [await blockAt(50)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 49, to: 51 } });
      await holds([49, 50]);

      // Only the metadata reply's scan reaches block 0; each push scans from where the last scan stopped.
      expect(has.mock.calls.filter(([index]) => index === 0)).toHaveLength(1);
    });

    test('a push finishing after newer blocks arrive does not send them back', async () => {
      const { replica, append, store, feedKey, blockAt, holds } = await setupFeeds(5);
      // The replica already holds blocks EDGE reports it lacks, as after EDGE lost them.
      await store(range(5));
      // Three more, so blocks 5–7 extend the replica with no hole and are eligible to be pushed back.
      for (const _ of range(3)) {
        await append();
      }

      const edge = await createScriptedEdge(async (message) => {
        if (message.type === 'get-metadata') {
          return { type: 'metadata', feedKey, length: 3 };
        }
        return undefined;
      });
      const { messenger } = await createClient(edge.endpoint);
      // Hold the client's first push open, so EDGE's newer blocks land while it is in flight.
      const pushing = new Trigger();
      const release = new Trigger();
      // `createClient` already spies on `send`, so the original comes from the class.
      const send: EdgeClient['send'] = (ctx, message) => EdgeClient.prototype.send.call(messenger, ctx, message);
      let held = false;
      vi.spyOn(messenger, 'send').mockImplementation(async (ctx, message) => {
        const payload = message.payload && decodeCbor(message.payload.value);
        if (payload?.type === 'data' && !held) {
          held = true;
          pushing.wake();
          await release.wait();
        }
        return send(ctx, message);
      });
      const replicator = new EdgeFeedReplicator({ messenger, spaceId: SpaceId.random() });
      await replicator.addHypercore(replica);
      await openAndClose(replicator);
      edge.admitConnection.wake();

      expect(await edge.next()).toMatchObject({ type: 'get-metadata' });
      await pushing.wait();
      edge.send({ type: 'data', feedKey, blocks: await Promise.all([5, 6, 7].map((index) => blockAt(index))) });
      await holds([5, 6, 7]);
      release.wake();

      expect(await edge.next()).toMatchObject({ type: 'data', blocks: [{ index: 3 }, { index: 4 }] });
      // The next message is the request this push causes, not blocks 5–7 pushed back.
      await append();
      await append();
      edge.send({ type: 'data', feedKey, blocks: [await blockAt(9)] });
      expect(await edge.next()).toMatchObject({ type: 'request', range: { from: 8, to: 10 } });
    });
  });

  const createEdge = async () => {
    const port = await getPort({ host: 'localhost', port: 7200, portRange: [7200, 7299] });
    let lastBlockIndex = -1;
    const admitConnection = new Trigger();
    const { cleanup, endpoint, messageSink, sendResponseMessage } = await createTestEdgeWsServer(port, {
      admitConnection,
      payloadDecoder: decodeCbor,
      messageHandler: async (message: any) => {
        if (message.type === 'get-metadata') {
          return encodeCbor({ type: 'metadata', feedKey: message.feedKey, length: lastBlockIndex + 1 });
        } else {
          lastBlockIndex = Math.max(lastBlockIndex, message.blocks[message.blocks.length - 1].index);
        }
      },
    });
    onTestFinished(cleanup);

    return {
      endpoint,
      messageSink,
      admitConnection,
      sendResponseMessage,
      feedLength: () => lastBlockIndex + 1,
    };
  };

  const createClient = async (endpoint: string) => {
    const reconnectTrigger = new Trigger();
    const messenger = new EdgeClient(await createEphemeralEdgeIdentity(), { socketEndpoint: endpoint });
    messenger.onReconnected(() => reconnectTrigger.wake());
    const sendSpy = vi.spyOn(messenger, 'send');
    await openAndClose(messenger);
    return { messenger, sendSpy, reconnectTrigger };
  };

  const attachReplicator = async (messenger: EdgeClient, options?: { skipOpen?: boolean }) => {
    const spaceId = SpaceId.random();
    const feed = await createNewFeed();
    const replicator = new EdgeFeedReplicator({ messenger, spaceId });
    await replicator.addHypercore(feed);
    if (!options?.skipOpen) {
      await openAndClose(replicator);
    }
    return { feed, replicator };
  };

  const createNewFeed = async () => {
    const storage = createStorage();
    const keyring = new Keyring();
    const hypercoreStore = new HypercoreStore<FeedMessage>({
      factory: new HypercoreFactory<FeedMessage>({
        root: storage.createDirectory(),
        signer: keyring,
        hypercore: { valueEncoding },
      }),
    });
    onTestFinished(() => hypercoreStore.close());
    return hypercoreStore.openHypercore(await keyring.createKey(), { writable: true });
  };

  const openReplica = async (key: PublicKey) => {
    const hypercoreStore = new HypercoreStore<FeedMessage>({
      factory: new HypercoreFactory<FeedMessage>({
        // RAM rather than the default on-disk root, which the source feed already writes to.
        root: createStorage({ type: StorageType.RAM }).createDirectory(),
        signer: new Keyring(),
        hypercore: { valueEncoding },
      }),
    });
    onTestFinished(() => hypercoreStore.close());
    return hypercoreStore.openHypercore(key, { writable: false, sparse: true });
  };

  const updateIdentity = async (messenger: EdgeClient) => {
    messenger.setIdentity(await createEphemeralEdgeIdentity());
  };
});
