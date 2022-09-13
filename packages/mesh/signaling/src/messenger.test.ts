//
// Copyright 2022 DXOS.org
//

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { afterTest } from '@dxos/testutils';

import { Messenger } from './messenger';
import { Any } from './proto/gen/google/protobuf';
import { Message } from './signal-methods';
import { WebsocketSignalManager } from './websocket-signal-manager';

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
    const onMessage = (message: Message) => received.push(message);

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

    const payload: Any = {
      type_url: 'a',
      value: Buffer.from('0')
    };

    const message: Message = { author: peerId1, recipient: peerId2, payload };

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
        payload: {
          type_url: 'a',
          value: Buffer.from('0')
        }
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
        payload: {
          type_url: 'b',
          value: Buffer.from('1')
        }
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
        payload: {
          type_url: 'c',
          value: Buffer.from('2')
        }
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
    const onMessage1 = mockFn<(message: Message) => void>().returns();
    await messenger2.listen({
      payloadType: '1',
      onMessage: onMessage1
    });

    // Subscribe first listener for second messenger.
    const onMessage2 = mockFn<(message: Message) => void>().returns();
    await messenger2.listen({
      payloadType: '1',
      onMessage: onMessage2
    });

    // Subscribe third listener for second messenger.
    const onMessage3 = mockFn<(message: Message) => void>().returns();
    await messenger2.listen({
      payloadType: '2',
      onMessage: onMessage3
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peerId1,
        recipient: peerId2,
        payload: {
          type_url: '1',
          value: Buffer.from('0')
        }
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
      payloadType: '1',
      onMessage: (message) => {
        messages1.push(message);
      }
    });

    // Subscribe first listener for second messenger.
    const messages2: Message[] = [];
    const listenerHandle2 = await messenger2.listen({
      payloadType: '1',
      onMessage: (message) => {
        messages2.push(message);
      }
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peerId1,
        recipient: peerId2,
        payload: {
          type_url: '1',
          value: Buffer.from('0')
        }
      };
      await messenger1.sendMessage(message);
      // 2 subscribed listeners should receive message.
      await waitForExpect(() => {
        expect(messages1[0]).toEqual(message);
        expect(messages2[0]).toEqual(message);
      }, 3_000);
    }

    // Unsubscribe second listener.
    listenerHandle2.unsubscribe();

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const message: Message = {
        author: peerId1,
        recipient: peerId2,
        payload: {
          type_url: '1',
          value: Buffer.from('0')
        }
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
});
