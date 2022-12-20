//
// Copyright 2022 DXOS.org
//

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { asyncTimeout, latch } from '@dxos/async';
import { TaggedType } from '@dxos/codec-protobuf';
import { TYPES } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { afterAll, beforeAll, describe, test, afterTest } from '@dxos/test';

import { Messenger } from './messenger';
import { WebsocketSignalManager } from './signal-manager';
import { Message } from './signal-methods';
import { TestBuilder } from './testing';

const PAYLOAD_1: TaggedType<TYPES, 'google.protobuf.Any'> = {
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.Example1',
  value: Buffer.from('1')
};

const PAYLOAD_2: TaggedType<TYPES, 'google.protobuf.Any'> = {
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.Example2',
  value: Buffer.from('2')
};

const PAYLOAD_3: TaggedType<TYPES, 'google.protobuf.Any'> = {
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.Example3',
  value: Buffer.from('3')
};

describe('Messenger', () => {
  let broker: TestBroker;

  beforeAll(async () => {
    broker = await createTestBroker();
  });

  afterAll(() => {
    broker.stop();
  });

  test('Message between peers', async () => {
    const builder = new TestBuilder({ signalHosts: [broker.url()] });
    afterTest(() => builder.close());
    const peer1 = builder.createPeer();
    const peer2 = builder.createPeer();

    const message: Message = {
      author: peer1.peerId,
      recipient: peer2.peerId,
      payload: PAYLOAD_1
    };

    const promise = peer2.waitTillReceive(message);

    await peer1.messenger.sendMessage(message);

    await asyncTimeout(promise, 1_000);
  });

  test('Message 3 peers', async () => {
    const builder = new TestBuilder({ signalHosts: [broker.url()] });
    afterTest(() => builder.close());
    const peer1 = builder.createPeer();
    const peer2 = builder.createPeer();
    const peer3 = builder.createPeer();

    {
      const message: Message = {
        author: peer1.peerId,
        recipient: peer2.peerId,
        payload: PAYLOAD_1
      };

      const promise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(promise, 1_000);
    }

    {
      const message: Message = {
        author: peer1.peerId,
        recipient: peer3.peerId,
        payload: PAYLOAD_2
      };

      const promise = peer3.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(promise, 1_000);
    }

    {
      const message: Message = {
        author: peer2.peerId,
        recipient: peer1.peerId,
        payload: PAYLOAD_3
      };

      const promise = peer1.waitTillReceive(message);
      await peer2.messenger.sendMessage(message);
      await asyncTimeout(promise, 1_000);
    }
  });

  test('Message routing', async () => {
    const builder = new TestBuilder({ signalHosts: [broker.url()] });
    afterTest(() => builder.close());
    const peer1 = builder.createPeer();
    const peer2 = builder.createPeer();

    // Subscribe first listener for second messenger.
    const onMessage1 = mockFn<(message: Message) => Promise<void>>().resolvesTo();
    await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_1.type_url,
      onMessage: onMessage1
    });

    // Subscribe first listener for second messenger.
    const onMessage2 = mockFn<(message: Message) => Promise<void>>().resolvesTo();
    await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_1.type_url,
      onMessage: onMessage2
    });

    // Subscribe third listener for second messenger.
    const onMessage3 = mockFn<(message: Message) => Promise<void>>().resolvesTo();
    await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_2.type_url,
      onMessage: onMessage3
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peer1.peerId,
        recipient: peer2.peerId,
        payload: PAYLOAD_1
      };
      await peer1.messenger.sendMessage(message);

      // 3 listeners (default one that was returned by setupPeer() and 2 that listen for type "1") should receive message.
      const promise = peer2.waitTillReceive(message);
      await asyncTimeout(promise, 1_000);
      expect(onMessage1).toHaveBeenCalledWith([message]);
      expect(onMessage2).toHaveBeenCalledWith([message]);
      expect(onMessage3).not.toHaveBeenCalledWith([message]);
    }
  });

  test('Unsubscribe listener', async () => {
    const builder = new TestBuilder({ signalHosts: [broker.url()] });
    afterTest(() => builder.close());
    const peer1 = builder.createPeer();
    const peer2 = builder.createPeer();

    // Subscribe first listener for second messenger.
    const messages1: Message[] = [];
    await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        messages1.push(message);
      }
    });

    // Subscribe first listener for second messenger.
    const messages2: Message[] = [];
    const listenerHandle2 = await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        messages2.push(message);
      }
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peer1.peerId,
        recipient: peer2.peerId,
        payload: PAYLOAD_1
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
        author: peer1.peerId,
        recipient: peer2.peerId,
        payload: PAYLOAD_1
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

  describe('Reliability', () => {
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

      const builder = new TestBuilder({ signalHosts: [broker.url()], messageDisruption: unreliableConnection });
      afterTest(() => builder.close());
      const peer1 = builder.createPeer();
      const peer2 = builder.createPeer();

      const message = {
        author: peer2.peerId,
        recipient: peer1.peerId,
        payload: PAYLOAD_1
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
    }).timeout(5_000);

    test('ignoring doubled messages', async () => {
      // Message got doubled going through signal network.
      const doublingMessage = (data: Message) => [data, data];

      const builder = new TestBuilder({ signalHosts: [broker.url()], messageDisruption: doublingMessage });
      afterTest(() => builder.close());
      const peer1 = builder.createPeer();
      const peer2 = builder.createPeer();

      const [promise, inc] = latch({ count: 1 });
      let count = 0;
      peer1.defaultReceived.on((msg) => {
        count = inc();
      });
      // sending message.
      await peer2.messenger.sendMessage({
        author: peer2.peerId,
        recipient: peer1.peerId,
        payload: PAYLOAD_1
      });
      // expect to receive 1 message.
      await asyncTimeout(promise(), 1000);
      expect(count).toEqual(1);
    });
  });
});
