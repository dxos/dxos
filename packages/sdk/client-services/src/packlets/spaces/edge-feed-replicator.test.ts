//
// Copyright 2022 DXOS.org
//

import { decode as decodeCbor, encode as encodeCbor } from 'cbor-x';
import { getRandomPort } from 'get-port-please';
import { describe, test, onTestFinished, vi, expect } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { valueEncoding } from '@dxos/echo-pipeline';
import { EdgeClient, EdgeIdentityChangedError } from '@dxos/edge-client';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { type FeedWrapper } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey, SpaceId } from '@dxos/keys';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage } from '@dxos/random-access-storage';
import { openAndClose } from '@dxos/test-utils';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { EdgeFeedReplicator } from './edge-feed-replicator';

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
    await expect.poll(() => messenger.isConnected).toBeTruthy();

    await attachReplicator(messenger);
    await expect.poll(() => messageSink.length).toEqual(1);
  });

  test('sends a block', async () => {
    const { endpoint, admitConnection, messageSink } = await createEdge();
    const { messenger } = await createClient(endpoint);

    const { feed } = await attachReplicator(messenger);

    admitConnection.wake();
    await appendMessage(feed);

    await expect.poll(() => messageSink.length).toEqual(2);
    expect(messageSink[1].type).toEqual('data');
  });

  test('re-requests metadata on reconnect', async () => {
    const { endpoint, admitConnection, messageSink } = await createEdge();
    const { messenger } = await createClient(endpoint);

    await attachReplicator(messenger);

    admitConnection.wake();
    await expect.poll(() => messageSink.length).toEqual(1);

    updateIdentity(messenger);
    await messenger.reconnect.waitForCount(1);

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
    updateIdentity(messenger);

    await expect.poll(() => messageSink.length).toEqual(1);
    expect(messageSink[0].type).toEqual('get-metadata');
  });

  test('recovers after response sending failure during identity change', async () => {
    const { endpoint, admitConnection, messageSink, sendResponseMessage } = await createEdge();
    const { messenger, sendSpy } = await createClient(endpoint);

    const { feed } = await attachReplicator(messenger);
    await appendMessage(feed);

    sendSpy.mockImplementationOnce(async (request: any) => {
      sendResponseMessage(request, encodeCbor({ type: 'metadata', feedKey: feed.key.toHex(), length: 0 }));
      return Promise.resolve();
    });
    sendSpy.mockImplementationOnce(async () => {
      throw new EdgeIdentityChangedError();
    });
    admitConnection.wake();

    await expect.poll(() => sendSpy.mock.calls.length).toEqual(2);
    expect(messageSink.length).toEqual(0);
    updateIdentity(messenger);

    await expect.poll(() => messageSink.length).toEqual(2);
    expect(messageSink[1].type).toEqual('data');
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
    updateIdentity(messenger);
    await sleep(100);
    admitConnection.wake();

    await expect.poll(() => messageSink.length).toEqual(2);
    expect(messageSink.map((m) => m.type)).toStrictEqual(range(2, () => 'get-metadata'));
  });

  test('block appended during reconnect', async () => {
    const { endpoint, admitConnection, feedLength } = await createEdge();
    const { messenger } = await createClient(endpoint);

    const { feed } = await attachReplicator(messenger);
    admitConnection.wake();
    await sleep(10);

    admitConnection.reset();
    updateIdentity(messenger);
    await appendMessage(feed);
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

    void appendMessage(feed);
    updateIdentity(messenger);

    await expect.poll(() => feedLength()).toEqual(1);
  });

  const createEdge = async () => {
    const port = await getRandomPort('127.0.0.1');
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
    const peerKey = PublicKey.random().toHex();
    const messenger = new EdgeClient(peerKey, peerKey, { socketEndpoint: endpoint });
    const sendSpy = vi.spyOn(messenger, 'send');
    await openAndClose(messenger);
    return { messenger, sendSpy };
  };

  const attachReplicator = async (messenger: EdgeClient, options?: { skipOpen?: boolean }) => {
    const spaceId = SpaceId.random();
    const feed = await createNewFeed();
    const replicator = new EdgeFeedReplicator({ messenger, spaceId });
    await replicator.addFeed(feed);
    if (!options?.skipOpen) {
      await openAndClose(replicator);
    }
    return { feed, replicator };
  };

  const createNewFeed = async () => {
    const storage = createStorage();
    const keyring = new Keyring();
    const feedStore = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory(),
        signer: keyring,
        hypercore: { valueEncoding },
      }),
    });
    onTestFinished(() => feedStore.close());
    return feedStore.openFeed(await keyring.createKey(), { writable: true });
  };

  const updateIdentity = (messenger: EdgeClient) => {
    const identityKey = PublicKey.random().toHex();
    messenger.setIdentity({ peerKey: messenger.peerKey, identityKey });
  };

  const appendMessage = (feed: FeedWrapper<FeedMessage>) => feed.append({ timeframe: new Timeframe() });
});
