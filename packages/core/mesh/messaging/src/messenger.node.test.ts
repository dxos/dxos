//
// Copyright 2022 DXOS.org
//

import { beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, latch, sleep } from '@dxos/async';

import { MemorySignalManager, MemorySignalManagerContext } from './signal-manager';
import { type Message } from './signal-methods';
import { PAYLOAD_1, PAYLOAD_2, PAYLOAD_3, TestBuilder, messageEqual } from './testing';

// TODO(mykola): Use EDGE signal server.
describe('Messenger with WebsocketSignalManager', () => {
  let context: MemorySignalManagerContext;
  beforeEach(async () => {
    context = new MemorySignalManagerContext();
  });

  const signalManagerFactory = async () => new MemorySignalManager(context);

  test('Message between peers', async () => {
    const builder = new TestBuilder({
      signalManagerFactory,
    });
    onTestFinished(() => builder.close());
    const peer1 = await builder.createPeer();
    const peer2 = await builder.createPeer();

    const message: Message = {
      author: peer1.peerInfo,
      recipient: peer2.peerInfo,
      payload: PAYLOAD_1,
    };

    await sleep(1000);

    const promise = peer2.waitTillReceive(message);

    await peer1.messenger.sendMessage(message);

    await promise;
  });

  test('Message 3 peers', { timeout: 1_000 }, async () => {
    const builder = new TestBuilder({
      signalManagerFactory,
    });
    onTestFinished(() => builder.close());
    const peer1 = await builder.createPeer();
    const peer2 = await builder.createPeer();
    const peer3 = await builder.createPeer();

    {
      const message: Message = {
        author: peer1.peerInfo,
        recipient: peer2.peerInfo,
        payload: PAYLOAD_1,
      };

      const promise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(promise, 1_000);
    }

    {
      const message: Message = {
        author: peer1.peerInfo,
        recipient: peer3.peerInfo,
        payload: PAYLOAD_2,
      };

      const promise = peer3.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(promise, 1_000);
    }

    {
      const message: Message = {
        author: peer2.peerInfo,
        recipient: peer1.peerInfo,
        payload: PAYLOAD_3,
      };

      const promise = peer1.waitTillReceive(message);
      await peer2.messenger.sendMessage(message);
      await asyncTimeout(promise, 1_000);
    }
  });

  test('Message routing', { timeout: 4_000 }, async () => {
    const builder = new TestBuilder({
      signalManagerFactory,
    });
    onTestFinished(() => builder.close());
    const peer1 = await builder.createPeer();
    const peer2 = await builder.createPeer();

    // Subscribe first listener for second messenger.
    const onMessage1: Message[] = [];
    await peer2.messenger.listen({
      peer: peer2.peerInfo,
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        onMessage1.push(message);
      },
    });

    // Subscribe first listener for second messenger.
    const onMessage2: Message[] = [];
    await peer2.messenger.listen({
      peer: peer2.peerInfo,
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        onMessage2.push(message);
      },
    });

    // Subscribe third listener for second messenger.
    const onMessage3: Message[] = [];
    await peer2.messenger.listen({
      peer: peer2.peerInfo,
      payloadType: PAYLOAD_2.type_url,
      onMessage: async (message) => {
        onMessage3.push(message);
      },
    });

    // Message from the 1st peer to the 2nd peer with payload type "2".
    {
      const message: Message = {
        author: peer1.peerInfo,
        recipient: peer2.peerInfo,
        payload: PAYLOAD_1,
      };
      const promise = peer2.waitTillReceive(message);

      await peer1.messenger.sendMessage(message);

      // 3 listeners (default one that was returned by setupPeer() and 2 that listen for type "1") should receive message.
      await asyncTimeout(promise, 1_000);
      expect(messageEqual(message, onMessage1[0])).toEqual(true);
      expect(messageEqual(message, onMessage2[0])).toEqual(true);
      expect(onMessage3.length === 0);
    }
  });

  test('Unsubscribe listener', { timeout: 1_000 }, async () => {
    const builder = new TestBuilder({
      signalManagerFactory,
    });
    onTestFinished(() => builder.close());
    const peer1 = await builder.createPeer();
    const peer2 = await builder.createPeer();

    // Subscribe first listener for second messenger.
    const messages1: Message[] = [];
    await peer2.messenger.listen({
      peer: peer2.peerInfo,
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        messages1.push(message);
      },
    });

    // Subscribe first listener for second messenger.
    const messages2: Message[] = [];
    const listenerHandle2 = await peer2.messenger.listen({
      peer: peer2.peerInfo,
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        messages2.push(message);
      },
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peer1.peerInfo,
        recipient: peer2.peerInfo,
        payload: PAYLOAD_1,
      };

      const receivePromise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);

      // 2 subscribed listeners should receive message.
      await asyncTimeout(receivePromise, 1_000);
      expect(messages1[0]).toEqual(message);
      expect(messages2[0]).toEqual(message);
    }

    // Unsubscribe second listener.
    await listenerHandle2.unsubscribe();

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peer1.peerInfo,
        recipient: peer2.peerInfo,
        payload: PAYLOAD_1,
      };

      const receivePromise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);

      // 1 listener that was not unsubscribed should receive message.
      await asyncTimeout(receivePromise, 1_000);
      expect(messages1[1]).toEqual(message);
      expect(messages1.length).toEqual(2);
      expect(messages2.length).toEqual(1);
    }
  });

  test('re-entrant message', { timeout: 1_000 }, async () => {
    const builder = new TestBuilder({
      signalManagerFactory,
    });
    onTestFinished(() => builder.close());
    const peer1 = await builder.createPeer();
    const peer2 = await builder.createPeer();

    const message: Message = {
      author: peer1.peerInfo,
      recipient: peer2.peerInfo,
      payload: PAYLOAD_1,
    };

    {
      const receivePromise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(receivePromise, 1_000);
    }

    {
      //
      // Close and reopen peer1
      //

      await peer2.close();
      await peer2.open();
    }

    {
      const receivePromise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(receivePromise, 1_000);
    }
  });

  describe('Reliability', { timeout: 5_000 }, () => {
    test('message with non reliable connection', async () => {
      // Simulate unreliable connection.
      // Only each 3rd message is sent.
      let i = 0;
      const unreliableConnection = (data: Message): Message[] => {
        i++;
        if (i % 3 !== 0) {
          return [data];
        }
        return [];
      };

      const builder = new TestBuilder({
        signalManagerFactory,
        messageDisruption: unreliableConnection,
      });
      onTestFinished(() => builder.close());
      const peer1 = await builder.createPeer();
      await peer1.open();
      const peer2 = await builder.createPeer();
      await peer2.open();

      const message = {
        author: peer2.peerInfo,
        recipient: peer1.peerInfo,
        payload: PAYLOAD_1,
      };

      const receivePromise = peer1.defaultReceived.waitForCount(3);
      // Sending 3 messages.
      Array(3)
        .fill(0)
        .forEach(async () => {
          await peer2.messenger.sendMessage(message);
        });

      // expect to receive 3 messages.
      await receivePromise;
    });

    test('ignoring doubled messages', { timeout: 5_000 }, async () => {
      // Message got doubled going through signal network.
      const doublingMessage = (data: Message) => [data, data];

      const builder = new TestBuilder({
        signalManagerFactory,
        messageDisruption: doublingMessage,
      });
      onTestFinished(() => builder.close());
      const peer1 = await builder.createPeer();
      await peer1.open();
      const peer2 = await builder.createPeer();
      await peer2.open();

      const [promise, inc] = latch({ count: 1 });
      let count = 0;
      peer1.defaultReceived.on((msg) => {
        count = inc();
      });
      // sending message.
      await peer2.messenger.sendMessage({
        author: peer2.peerInfo,
        recipient: peer1.peerInfo,
        payload: PAYLOAD_1,
      });
      // expect to receive 1 message.
      await asyncTimeout(promise(), 1000);
      expect(count).toEqual(1);
    });
  });
});
