//
// Copyright 2024 DXOS.org
//
import { EdgeClient } from '@dxos/edge-client';
import { PublicKey } from '@dxos/keys';
import { describe, openAndClose, test } from '@dxos/test';

import { EdgeSignal } from './edge-signal-manager';
import { type Message } from '../signal-methods';
import { expectPeerAvailable, expectPeerLeft, expectReceivedMessage } from '../testing';

// TODO(mykola): Expects wrangler dev on edge repo to run. Skip to pass CI.
describe.only('EdgeSignalManager', () => {
  const setupPeer = async () => {
    const [identityKey, deviceKey] = PublicKey.randomSequence();

    const client = new EdgeClient(identityKey, deviceKey, { socketEndpoint: 'ws://localhost:8787' });
    await openAndClose(client);
    const edgeSignal = new EdgeSignal({ messengerClient: client });
    await openAndClose(edgeSignal);

    return { identityKey, deviceKey, client, edgeSignal };
  };

  test('two peers discover each other', async () => {
    const topic = PublicKey.random();
    const peer1 = await setupPeer();
    const peer2 = await setupPeer();

    const discover12 = expectPeerAvailable(peer1.edgeSignal, topic, peer2.deviceKey);
    const discover21 = expectPeerAvailable(peer2.edgeSignal, topic, peer1.deviceKey);

    await peer1.edgeSignal.join({ topic, peerId: peer1.deviceKey });
    await peer2.edgeSignal.join({ topic, peerId: peer2.deviceKey });

    await discover12;
    await discover21;
  });

  test('join and leave swarm', async () => {
    const topic = PublicKey.random();
    const peer1 = await setupPeer();
    const peer2 = await setupPeer();

    const discover12 = expectPeerAvailable(peer1.edgeSignal, topic, peer2.deviceKey);
    const left12 = expectPeerLeft(peer1.edgeSignal, topic, peer2.deviceKey);

    await peer1.edgeSignal.join({ topic, peerId: peer1.deviceKey });
    await peer2.edgeSignal.join({ topic, peerId: peer2.deviceKey });
    await discover12;

    await peer2.edgeSignal.leave({ topic, peerId: peer2.deviceKey });
    await left12;
  });

  test('message between peers', async () => {
    const peer1 = await setupPeer();
    const peer2 = await setupPeer();
    const message: Message = {
      author: { identityKey: peer1.identityKey.toHex(), peerKey: peer1.deviceKey.toHex() },
      recipient: [{ identityKey: peer2.identityKey.toHex(), peerKey: peer2.deviceKey.toHex() }],
      payload: { type_url: 'google.protobuf.Any', value: Uint8Array.from([1, 2, 3]) },
    };

    const receivedMessage = expectReceivedMessage(peer2.edgeSignal, message);
    await peer2.edgeSignal.subscribeMessages(peer2.deviceKey);
    await peer1.edgeSignal.sendMessage(message);

    await receivedMessage;
  });
});
