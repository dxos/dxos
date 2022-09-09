//
// Copyright 2022 DXOS.org
//

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { afterTest } from '@dxos/testutils';

import { Messenger, Message } from './messenger';
import { Any } from './proto/gen/google/protobuf';
import { SignalManagerImpl } from './signal-manager-impl';

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
    const receiveMock = (message: Message) => received.push(message);

    const peerId = PublicKey.random();

    const signalManager = new SignalManagerImpl([broker.url()]);
    // Add another subscribe besides one in constructor to fix race condition.
    await signalManager.subscribeMessages(peerId);
    afterTest(() => signalManager.destroy());

    const messenger = new Messenger({
      ownPeerId: peerId,
      signalManager
    });

    messenger.listen({ listener: receiveMock });

    return {
      messenger,
      received
    };
  };

  it('Message between peers', async () => {
    const { messenger: messenger1 } = await setup();
    const { messenger: messenger2, received: received2 } = await setup();

    const payload: Any = {
      type_url: 'a',
      value: Buffer.from('0')
    };

    await messenger1.message({ recipient: messenger2.ownPeerId, payload });

    const message: Message = {
      author: messenger1.ownPeerId,
      recipient: messenger2.ownPeerId,
      payload
    };

    await waitForExpect(() => {
      expect(received2[0]).toBeAnObjectWith(message);
    }, 5_000);
  });

  it('Message 3 peers', async () => {
    const { messenger: messenger1, received: received1 } = await setup();
    const { messenger: messenger2, received: received2 } = await setup();
    const { messenger: messenger3, received: received3 } = await setup();

    {
      const payload: Any = {
        type_url: 'a',
        value: Buffer.from('0')
      };
      await messenger1.message({ recipient: messenger2.ownPeerId, payload });
      const message: Message = {
        author: messenger1.ownPeerId,
        recipient: messenger2.ownPeerId,
        payload
      };
      await waitForExpect(() => {
        expect(received2[0]).toBeAnObjectWith(message);
      }, 3_000);
    }

    {
      const payload: Any = {
        type_url: 'b',
        value: Buffer.from('1')
      };
      await messenger1.message({ recipient: messenger3.ownPeerId, payload });
      const message: Message = {
        author: messenger1.ownPeerId,
        recipient: messenger3.ownPeerId,
        payload
      };
      await waitForExpect(() => {
        expect(received3[0]).toBeAnObjectWith(message);
      }, 3_000);
    }

    {
      const payload: Any = {
        type_url: 'c',
        value: Buffer.from('2')
      };
      await messenger2.message({ recipient: messenger1.ownPeerId, payload });
      const message: Message = {
        author: messenger2.ownPeerId,
        recipient: messenger1.ownPeerId,
        payload
      };
      await waitForExpect(() => {
        expect(received1[0]).toBeAnObjectWith(message);
      }, 3_000);
    }
  });

  it('Message routing', async () => {
    const { messenger: messenger1 } = await setup();
    const { messenger: messenger2, received: received2 } = await setup();

    // Subscribe first listener for second messenger.
    const listener1 = mockFn<(message: Message) => void>().returns();
    messenger2.listen({
      payloadType: '1',
      listener: listener1
    });

    // Subscribe first listener for second messenger.
    const listener2 = mockFn<(message: Message) => void>().returns();
    messenger2.listen({
      payloadType: '1',
      listener: listener2
    });

    // Subscribe third listener for second messenger.
    const listener3 = mockFn<(message: Message) => void>().returns();
    messenger2.listen({
      payloadType: '2',
      listener: listener3
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const payload: Any = {
        type_url: '1',
        value: Buffer.from('0')
      };
      await messenger1.message({ recipient: messenger2.ownPeerId, payload });
      const message: Message = {
        author: messenger1.ownPeerId,
        recipient: messenger2.ownPeerId,
        payload
      };
      // 3 listeners (default one that was returned by setup() and 2 that listen for type "1") should receive message.
      await waitForExpect(() => {
        expect(received2.at(-1)!).toBeAnObjectWith(message);
        expect(listener1).toHaveBeenCalledWith([message]);
        expect(listener2).toHaveBeenCalledWith([message]);
        expect(listener3).not.toHaveBeenCalledWith([message]);
      }, 3_000);
    }
  });

  it('Unsubscribe listener', async () => {
    const { messenger: messenger1 } = await setup();
    const { messenger: messenger2 } = await setup();

    // Subscribe first listener for second messenger.
    const messages1: Message[] = [];
    messenger2.listen({
      payloadType: '1',
      listener: message => {
        messages1.push(message);
      }
    });

    // Subscribe first listener for second messenger.
    const messages2: Message[] = [];
    const listenerHandle2 = messenger2.listen({
      payloadType: '1',
      listener: message => {
        messages2.push(message);
      }
    });

    // Message from the 1st peer to the 2nd peer with payload type "1".
    {
      const payload: Any = {
        type_url: '1',
        value: Buffer.from('0')
      };
      await messenger1.message({ recipient: messenger2.ownPeerId, payload });
      const message: Message = {
        author: messenger1.ownPeerId,
        recipient: messenger2.ownPeerId,
        payload
      };
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
      const payload: Any = {
        type_url: '1',
        value: Buffer.from('0')
      };
      await messenger1.message({ recipient: messenger2.ownPeerId, payload });
      const message: Message = {
        author: messenger1.ownPeerId,
        recipient: messenger2.ownPeerId,
        payload
      };
      // 1 listener that was not unsubscribed should receive message.
      await waitForExpect(() => {
        expect(messages1[1]).toEqual(message);
        expect(messages1.length).toEqual(2);
        expect(messages2.length).toEqual(1);
        // expect(listener2)([message]);
      }, 3_000);
    }
  });
});
