//
// Copyright 2022 DXOS.org
//

import { expect } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { afterTest } from '@dxos/testutils';

import { Messenger } from './messenger';
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

  const setup = async (): Promise<{messenger: Messenger, received: [author: PublicKey, payload: Any][]}> => {
    const received: [author: PublicKey, payload: Any][] = [];
    const receiveMock = async (author: PublicKey, payload: Any) => {
      received.push([author, payload]);
    };

    const peerId = PublicKey.random();

    const signalManager = new SignalManagerImpl([broker.url()]);
    // Add another subscribe besides one in constructor to fix race condition.
    await signalManager.subscribeMessages(peerId);
    afterTest(() => signalManager.destroy());

    const messenger = new Messenger({
      ownPeerId: peerId,
      receive: receiveMock,
      signalManager
    });

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

    await messenger1.message(messenger2.ownPeerId, payload);

    await waitForExpect(() => {
      expect(received2[0]).toEqual([messenger1.ownPeerId, payload]);
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
      await messenger1.message(messenger2.ownPeerId, payload);
      await waitForExpect(() => {
        expect(received2[0]).toEqual([messenger1.ownPeerId, payload]);
      }, 3_000);
    }

    {
      const payload: Any = {
        type_url: 'b',
        value: Buffer.from('1')
      };
      await messenger1.message(messenger3.ownPeerId, payload);
      await waitForExpect(() => {
        expect(received3[0]).toEqual([messenger1.ownPeerId, payload]);
      }, 3_000);
    }

    {
      const payload: Any = {
        type_url: 'c',
        value: Buffer.from('2')
      };
      messenger2.message(messenger1.ownPeerId, payload);
      await waitForExpect(() => {
        expect(received1[0]).toEqual([messenger2.ownPeerId, payload]);
      }, 3_000);
    }
  });
});
