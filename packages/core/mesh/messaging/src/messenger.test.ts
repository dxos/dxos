//
// Copyright 2022 DXOS.org
//

import { expect, mockFn } from 'earljs';

import { asyncTimeout, latch, sleep } from '@dxos/async';
import { type TaggedType } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { type TYPES } from '@dxos/protocols';
import { runTestSignalServer, type SignalServerRunner } from '@dxos/signal';
import { afterAll, beforeAll, describe, test } from 'vitest';
import { range } from '@dxos/util';
import { tagEnabled } from '@dxos/test/testutils';
import { log } from '@dxos/log';

import { Messenger } from './messenger';
import { WebsocketSignalManager } from './signal-manager';
import { type Message } from './signal-methods';
import { TestBuilder } from './testing';

const PAYLOAD_1: TaggedType<TYPES, 'google.protobuf.Any'> = {
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.Example1',
  value: Buffer.from('1'),
};

const PAYLOAD_2: TaggedType<TYPES, 'google.protobuf.Any'> = {
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.Example2',
  value: Buffer.from('2'),
};

const PAYLOAD_3: TaggedType<TYPES, 'google.protobuf.Any'> = {
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.Example3',
  value: Buffer.from('3'),
};

describe('Messenger', () => {
  let broker: SignalServerRunner;

  beforeAll(async () => {
    broker = await runTestSignalServer();
  });

  afterAll(() => {
    void broker.stop();
  });

  test('Message between peers', { timeout: 1_000 }, async (t) => {
    const builder = new TestBuilder({ signalHosts: [{ server: broker.url() }] });
    t.onTestFinished(() => builder.close());
    const peer1 = builder.createPeer();
    await peer1.open();
    const peer2 = builder.createPeer();
    await peer2.open();

    const message: Message = {
      author: peer1.peerId,
      recipient: peer2.peerId,
      payload: PAYLOAD_1,
    };

    const promise = peer2.waitTillReceive(message);

    await peer1.messenger.sendMessage(message);

    await asyncTimeout(promise, 1_000);
  });

  test('Message 3 peers', { timeout: 1_000 }, async (t) => {
    const builder = new TestBuilder({ signalHosts: [{ server: broker.url() }] });
    t.onTestFinished(() => builder.close());
    const peer1 = builder.createPeer();
    await peer1.open();
    const peer2 = builder.createPeer();
    await peer2.open();
    const peer3 = builder.createPeer();
    await peer3.open();

    {
      const message: Message = {
        author: peer1.peerId,
        recipient: peer2.peerId,
        payload: PAYLOAD_1,
      };

      const promise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(promise, 1_000);
    }

    {
      const message: Message = {
        author: peer1.peerId,
        recipient: peer3.peerId,
        payload: PAYLOAD_2,
      };

      const promise = peer3.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(promise, 1_000);
    }

    {
      const message: Message = {
        author: peer2.peerId,
        recipient: peer1.peerId,
        payload: PAYLOAD_3,
      };

      const promise = peer1.waitTillReceive(message);
      await peer2.messenger.sendMessage(message);
      await asyncTimeout(promise, 1_000);
    }
  });

  test('Message routing', { timeout: 1_000 }, async (t) => {
    const builder = new TestBuilder({ signalHosts: [{ server: broker.url() }] });
    t.onTestFinished(() => builder.close());
    const peer1 = builder.createPeer();
    await peer1.open();
    const peer2 = builder.createPeer();
    await peer2.open();

    // Subscribe first listener for second messenger.
    const onMessage1 = mockFn<(message: Message) => Promise<void>>().resolvesTo();
    await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_1.type_url,
      onMessage: onMessage1,
    });

    // Subscribe first listener for second messenger.
    const onMessage2 = mockFn<(message: Message) => Promise<void>>().resolvesTo();
    await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_1.type_url,
      onMessage: onMessage2,
    });

    // Subscribe third listener for second messenger.
    const onMessage3 = mockFn<(message: Message) => Promise<void>>().resolvesTo();
    await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_2.type_url,
      onMessage: onMessage3,
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peer1.peerId,
        recipient: peer2.peerId,
        payload: PAYLOAD_1,
      };
      const promise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);

      // 3 listeners (default one that was returned by setupPeer() and 2 that listen for type "1") should receive message.
      await asyncTimeout(promise, 1_000);
      expect(onMessage1).toHaveBeenCalledWith([message]);
      expect(onMessage2).toHaveBeenCalledWith([message]);
      expect(onMessage3).not.toHaveBeenCalledWith([message]);
    }
  });

  test.runIf(tagEnabled('flaky'))('Unsubscribe listener', { timeout: 1_000 }, async (t) => {
    const builder = new TestBuilder({ signalHosts: [{ server: broker.url() }] });
    t.onTestFinished(() => builder.close());
    const peer1 = builder.createPeer();
    await peer1.open();
    const peer2 = builder.createPeer();
    await peer2.open();

    // Subscribe first listener for second messenger.
    const messages1: Message[] = [];
    await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        messages1.push(message);
      },
    });

    // Subscribe first listener for second messenger.
    const messages2: Message[] = [];
    const listenerHandle2 = await peer2.messenger.listen({
      peerId: peer2.peerId,
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        messages2.push(message);
      },
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peer1.peerId,
        recipient: peer2.peerId,
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
        author: peer1.peerId,
        recipient: peer2.peerId,
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

  test('re-entrant message', { timeout: 1_000 }, async (t) => {
    const builder = new TestBuilder({ signalHosts: [{ server: broker.url() }] });
    t.onTestFinished(() => builder.close());
    const peer1 = builder.createPeer();
    await peer1.open();
    const peer2 = builder.createPeer();
    await peer2.open();

    const message: Message = {
      author: peer1.peerId,
      recipient: peer2.peerId,
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

  test('Message with broken signal server', { timeout: 1_000 }, async (t) => {
    const builder = new TestBuilder({ signalHosts: [{ server: 'ws://broken.kube.' }, { server: broker.url() }] });
    t.onTestFinished(() => builder.close());
    const peer1 = builder.createPeer();
    await peer1.open();
    const peer2 = builder.createPeer();
    await peer2.open();

    const message: Message = {
      author: peer1.peerId,
      recipient: peer2.peerId,
      payload: PAYLOAD_1,
    };

    {
      const receivePromise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(receivePromise, 1_000);
    }
  });

  describe('Reliability', { timeout: 2_000 }, () => {
    // TODO(dmaretskyi): Broken during vitest transition.
    test.skip('message with non reliable connection', async (t) => {
      // Simulate unreliable connection.
      // Only each 3rd message is sent.
      let i = 0;
      const unreliableConnection = (data: Message): Message[] => {
        i++;
        log.info('unreliableConnection', { i, send: i % 3 !== 0 });
        if (i % 3 !== 0) {
          return [data];
        }
        return [];
      };

      const builder = new TestBuilder({
        signalHosts: [{ server: broker.url() }],
        messageDisruption: unreliableConnection,
      });
      t.onTestFinished(() => builder.close());
      const peer1 = builder.createPeer();
      await peer1.open();
      const peer2 = builder.createPeer();
      await peer2.open();

      const message = {
        author: peer2.peerId,
        recipient: peer1.peerId,
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

    test('ignoring doubled messages', { timeout: 1_000 }, async (t) => {
      // Message got doubled going through signal network.
      const doublingMessage = (data: Message) => [data, data];

      const builder = new TestBuilder({ signalHosts: [{ server: broker.url() }], messageDisruption: doublingMessage });
      t.onTestFinished(() => builder.close());
      const peer1 = builder.createPeer();
      await peer1.open();
      const peer2 = builder.createPeer();
      await peer2.open();

      const [promise, inc] = latch({ count: 1 });
      let count = 0;
      peer1.defaultReceived.on((msg) => {
        count = inc();
      });
      // sending message.
      await peer2.messenger.sendMessage({
        author: peer2.peerId,
        recipient: peer1.peerId,
        payload: PAYLOAD_1,
      });
      // expect to receive 1 message.
      await asyncTimeout(promise(), 1000);
      expect(count).toEqual(1);
    });
  });

  describe('load', () => {
    test.runIf(tagEnabled('stress'))('many connections to KUBE', { timeout: 5_000 }, async () => {
      // let numReceived = 0;
      void range(100).map(async () => {
        const peerId = PublicKey.random();
        const newLocal = new WebsocketSignalManager([{ server: 'wss://dev.kube.dxos.org/.well-known/dx/signal' }]);
        await newLocal.open();
        const messenger = new Messenger({ signalManager: newLocal });

        // newLocal.join({
        //   topic: peerId,
        //   peerId: peerId,
        // })

        await messenger.listen({
          peerId,
          onMessage: async (msg) => {
            // console.log(++numReceived);
          },
        });

        void messenger.sendMessage({
          author: peerId,
          recipient: peerId,
          payload: {
            type_url: 'dxos.test',
            value: Buffer.from('TEST'),
          },
        });
      });

      await sleep(1000000);
    });
  });
});
