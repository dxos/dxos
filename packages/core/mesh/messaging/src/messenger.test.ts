//
// Copyright 2022 DXOS.org
//

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { Any, TaggedType } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { TYPES } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { afterTest } from '@dxos/testutils';

import { Messenger } from './messenger';
import { Message } from './signal-methods';
import { WebsocketSignalManager } from './websocket-signal-manager';

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

  before(async () => {
    broker = await createTestBroker();
  });

  after(() => {
    broker.stop();
  });

  const setup = async () => {
    const received: Message[] = [];
    const onMessage = async (message: Message) => {
      received.push(message);
    };

    const peerId = PublicKey.random();

    const signalManager = new WebsocketSignalManager([broker.url()]);
    await signalManager.subscribeMessages(peerId);
    afterTest(() => signalManager.destroy());

    const messenger = new Messenger({
      signalManager
    });

    await messenger.listen({ onMessage });

    return {
      messenger,
      peerId,
      received
    };
  };

  it('Message between peers', async () => {
    const { messenger: messenger1, peerId: peerId1 } = await setup();
    const { peerId: peerId2, received: received2 } = await setup();

    const message: Message = { author: peerId1, recipient: peerId2, payload: PAYLOAD_1 };

    await messenger1.sendMessage(message);

    await waitForExpect(() => {
      expect(received2[0]).toBeAnObjectWith(message);
    }, 5_000);
  });

  it('Message 3 peers', async () => {
    const {
      messenger: messenger1,
      received: received1,
      peerId: peerId1
    } = await setup();
    const {
      messenger: messenger2,
      received: received2,
      peerId: peerId2
    } = await setup();
    const { received: received3, peerId: peerId3 } = await setup();

    {
      const message: Message = {
        author: peerId1,
        recipient: peerId2,
        payload: PAYLOAD_1
      };
      await messenger1.sendMessage(message);
      await waitForExpect(() => {
        expect(received2[0]).toBeAnObjectWith(message);
      }, 3_000);
    }

    {
      const message: Message = {
        author: peerId1,
        recipient: peerId3,
        payload: PAYLOAD_2
      };
      await messenger1.sendMessage(message);
      await waitForExpect(() => {
        expect(received3[0]).toBeAnObjectWith(message);
      }, 3_000);
    }

    {
      const message: Message = {
        author: peerId2,
        recipient: peerId1,
        payload: PAYLOAD_3
      };
      await messenger2.sendMessage(message);
      await waitForExpect(() => {
        expect(received1[0]).toBeAnObjectWith(message);
      }, 3_000);
    }
  });

  it('Message routing', async () => {
    const { messenger: messenger1, peerId: peerId1 } = await setup();
    const {
      messenger: messenger2,
      received: received2,
      peerId: peerId2
    } = await setup();

    // Subscribe first listener for second messenger.
    const onMessage1 = mockFn<(message: Message) => Promise<void>>().resolvesTo();
    await messenger2.listen({
      payloadType: PAYLOAD_1.type_url,
      onMessage: onMessage1
    });

    // Subscribe first listener for second messenger.
    const onMessage2 = mockFn<(message: Message) => Promise<void>>().resolvesTo();
    await messenger2.listen({
      payloadType: PAYLOAD_1.type_url,
      onMessage: onMessage2
    });

    // Subscribe third listener for second messenger.
    const onMessage3 = mockFn<(message: Message) => Promise<void>>().resolvesTo();
    await messenger2.listen({
      payloadType: PAYLOAD_2.type_url,
      onMessage: onMessage3
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peerId1,
        recipient: peerId2,
        payload: PAYLOAD_1
      };
      await messenger1.sendMessage(message);
      // 3 listeners (default one that was returned by setup() and 2 that listen for type "1") should receive message.
      await waitForExpect(() => {
        expect(received2.at(-1)!).toBeAnObjectWith(message);
        expect(onMessage1).toHaveBeenCalledWith([message]);
        expect(onMessage2).toHaveBeenCalledWith([message]);
        expect(onMessage3).not.toHaveBeenCalledWith([message]);
      }, 3_000);
    }
  });

  it('Unsubscribe listener', async () => {
    const { messenger: messenger1, peerId: peerId1 } = await setup();
    const { messenger: messenger2, peerId: peerId2 } = await setup();

    // Subscribe first listener for second messenger.
    const messages1: Message[] = [];
    await messenger2.listen({
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        messages1.push(message);
      }
    });

    // Subscribe first listener for second messenger.
    const messages2: Message[] = [];
    const listenerHandle2 = await messenger2.listen({
      payloadType: PAYLOAD_1.type_url,
      onMessage: async (message) => {
        messages2.push(message);
      }
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peerId1,
        recipient: peerId2,
        payload: PAYLOAD_1
      };
      await messenger1.sendMessage(message);
      // 2 subscribed listeners should receive message.
      await waitForExpect(() => {
        expect(messages1[0]).toEqual(message);
        expect(messages2[0]).toEqual(message);
      }, 3_000);
    }

    // Unsubscribe second listener.
    await listenerHandle2.unsubscribe();

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peerId1,
        recipient: peerId2,
        payload: PAYLOAD_1
      };
      await messenger1.sendMessage(message);
      // 1 listener that was not unsubscribed should receive message.
      await waitForExpect(() => {
        expect(messages1[1]).toEqual(message);
        expect(messages1.length).toEqual(2);
        expect(messages2.length).toEqual(1);
      }, 3_000);
    }
  });

  describe('Reliability', () => {
    interface SendMessageArgs {
      author: PublicKey
      recipient: PublicKey
      payload: Any
    }

    const setup = async ({
      // Imitates signal network disruptions (e. g. message doubling, ).
      messageDisruption = (data) => [data]
    }: {
      messageDisruption?: (data: SendMessageArgs) => SendMessageArgs[]
    } = {}) => {
      const received: Message[] = [];
      const onMessage = async (message: Message) => {
        received.push(message);
      };

      const peerId = PublicKey.random();

      const signalManager = new WebsocketSignalManager([broker.url()]);
      await signalManager.subscribeMessages(peerId);
      const trueSend = signalManager.sendMessage.bind(signalManager);
      signalManager.sendMessage = async (message) => {
        for (const msg of messageDisruption(message)) {
          await trueSend(msg);
        }
      };
      afterTest(() => signalManager.destroy());

      const messenger = new Messenger({
        signalManager
      });

      await messenger.listen({ onMessage });

      return {
        messenger,
        peerId,
        received
      };
    };

    it('message with non reliable connection', async () => {
      // Simulate unreliable connection.
      // Only each 3rd message is sent.
      let i = 0;
      const unreliableConnection = (
        data: SendMessageArgs
      ): SendMessageArgs[] => {
        i++;
        if (i % 3 !== 0) {
          return [data];
        }
        return [];
      };

      const { peerId: peerId1, received: received1 } = await setup();

      const { messenger: messenger2, peerId: peerId2 } = await setup({
        messageDisruption: unreliableConnection
      });

      // Sending 3 messages.
      // Setup sends messages directly to between. So we don`t need to specify any ids.
      Array(3)
        .fill(0)
        .forEach(async () => {
          await messenger2.sendMessage({
            author: peerId2,
            recipient: peerId1,
            payload: PAYLOAD_1
          });
        });
      // expect to receive 3 messages.
      await waitForExpect(() => {
        expect(received1.length).toEqual(3);
      }, 4_000);
    }).timeout(5_000);

    it('ignoring doubled messages', async () => {
      // Message got doubled going through signal network.
      const doublingMessage = (data: SendMessageArgs) => [data, data];

      const { peerId: peerId1, received: received1 } = await setup();

      const { messenger: messenger2, peerId: peerId2 } = await setup({
        messageDisruption: doublingMessage
      });

      // sending message.
      await messenger2.sendMessage({
        author: peerId2,
        recipient: peerId1,
        payload: PAYLOAD_1
      });
      // expect to receive 1 message.
      await waitForExpect(() => {
        expect(received1.length).toEqual(1);
      }, 4_000);
    }).timeout(5_000);
  });
});
