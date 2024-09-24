//
// Copyright 2024 DXOS.org
//
import { onTestFinished, describe, test } from 'vitest';

import { EdgeClient } from '@dxos/edge-client';
import { PublicKey } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';

import { EdgeSignalManager } from './edge-signal-manager';
import { createMessage, expectReceivedMessage, TestBuilder, type TestBuilderOptions } from '../testing';

// TODO(mykola): Expects wrangler dev in edge repo to run. Skip to pass CI.
describe.skip('EdgeSignalManager', () => {
  const edgeSignalFactory: TestBuilderOptions['signalManagerFactory'] = async (identityKey, deviceKey) => {
    const client = new EdgeClient(identityKey.toHex(), deviceKey.toHex(), { socketEndpoint: 'ws://localhost:8787' });
    await openAndClose(client);

    return new EdgeSignalManager({ edgeConnection: client });
  };

  test('two peers discover each other', async () => {
    const builder = new TestBuilder({ signalManagerFactory: edgeSignalFactory });
    onTestFinished(() => builder.close());
    const [peer1, peer2] = await builder.createPeers(2);

    const topic = PublicKey.random();

    const discover12 = peer1.waitForPeerAvailable(topic, peer2.peerInfo);
    const discover21 = peer2.waitForPeerAvailable(topic, peer1.peerInfo);

    await peer1.signalManager.join({ topic, peer: peer1.peerInfo });
    await peer2.signalManager.join({ topic, peer: peer2.peerInfo });

    await discover12;
    await discover21;
  });

  test('join and leave swarm', async () => {
    const builder = new TestBuilder({ signalManagerFactory: edgeSignalFactory });
    onTestFinished(() => builder.close());
    const [peer1, peer2] = await builder.createPeers(2);

    const topic = PublicKey.random();

    const discover12 = peer1.waitForPeerAvailable(topic, peer2.peerInfo);
    const left12 = peer1.waitForPeerLeft(topic, peer2.peerInfo);

    await peer2.signalManager.join({ topic, peer: peer2.peerInfo });
    await peer1.signalManager.join({ topic, peer: peer1.peerInfo });
    await discover12;

    await peer2.signalManager.leave({ topic, peer: peer2.peerInfo });
    await left12;
  });

  test('message between peers', async () => {
    const builder = new TestBuilder({ signalManagerFactory: edgeSignalFactory });
    onTestFinished(() => builder.close());
    const [peer1, peer2] = await builder.createPeers(2);
    const message = createMessage(peer1.peerInfo, peer2.peerInfo);

    const receivedMessage = expectReceivedMessage(peer2.signalManager.onMessage, message);
    await peer2.signalManager.subscribeMessages(peer2.peerInfo);
    await peer1.signalManager.sendMessage(message);

    await receivedMessage;
  });
});
