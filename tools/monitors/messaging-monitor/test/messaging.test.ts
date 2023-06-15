//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { TaggedType } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { Messenger, WebsocketSignalManager } from '@dxos/messaging';
import { TYPES } from '@dxos/protocols';

const SIGNAL_SERVER =
  process.env.DX_ENVIRONMENT === 'development'
    ? 'wss://dev.kube.dxos.org/.well-known/dx/signal'
    : process.env.DX_ENVIRONMENT === 'staging'
    ? 'wss://staging.kube.dxos.org/.well-known/dx/signal'
    : 'wss://kube.dxos.org/.well-known/dx/signal';

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

type Peer = {
  id: PublicKey;
  signalManager: WebsocketSignalManager;
  messenger: Messenger;
  close: () => Promise<void>;
};

const createPeer = async (params: Parameters<Messenger['listen']>[0]): Promise<Peer> => {
  const signalManager = new WebsocketSignalManager([{ server: SIGNAL_SERVER }]);
  const messenger = new Messenger({ signalManager });
  await signalManager.open();
  const handle = await messenger.listen(params);

  const close = async () => {
    await handle.unsubscribe();
    await messenger.close();
    await signalManager.close();
  };

  return {
    id: params.peerId,
    signalManager,
    messenger,
    close,
  };
};

describe('Messenger', () => {
  const peers: Peer[] = [];
  afterEach(async () => {
    while (peers.length > 0) {
      const peer = peers.pop();
      await peer?.close();
    }
  });

  it('Message between peers', async () => {
    const received = new Trigger<Parameters<Messenger['sendMessage']>[0]>();
    const peer1 = await createPeer({ peerId: PublicKey.random(), onMessage: async () => {} });
    const peer2 = await createPeer({
      peerId: PublicKey.random(),
      onMessage: async (msg) => {
        received.wake(msg);
      },
    });

    peers.push(peer1, peer2);

    await peer1.messenger.sendMessage({
      author: peer1.id,
      recipient: peer2.id,
      payload: PAYLOAD_1,
    });

    const message = await received.wait();
    expect(message.author).to.deep.equal(peer1.id);
    expect(message.recipient).to.deep.equal(peer2.id);
    expect(message.payload).to.deep.equal(PAYLOAD_1);
  });

  it('Message between multiple peers', async () => {
    const received = new Trigger<boolean>();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();
    const peer3Id = PublicKey.random();

    const peer1 = await createPeer({
      peerId: peer1Id,
      onMessage: async (msg) => {
        expect(msg.author).to.deep.equal(peer3Id);
        expect(msg.payload).to.deep.equal(PAYLOAD_3);
        received.wake(true);
      },
    });
    const peer2 = await createPeer({
      peerId: peer2Id,
      onMessage: async (msg) => {
        expect(msg.author).to.deep.equal(peer1Id);
        expect(msg.payload).to.deep.equal(PAYLOAD_1);
        await peer2.messenger.sendMessage({
          author: peer2Id,
          recipient: peer3Id,
          payload: PAYLOAD_2,
        });
      },
    });
    const peer3 = await createPeer({
      peerId: peer3Id,
      onMessage: async (msg) => {
        expect(msg.author).to.deep.equal(peer2Id);
        expect(msg.payload).to.deep.equal(PAYLOAD_2);
        await peer3.messenger.sendMessage({
          author: peer3Id,
          recipient: peer1Id,
          payload: PAYLOAD_3,
        });
      },
    });

    peers.push(peer1, peer2, peer3);

    await peer1.messenger.sendMessage({
      author: peer1Id,
      recipient: peer2Id,
      payload: PAYLOAD_1,
    });

    expect(await received.wait()).to.be.true;
  });
});
