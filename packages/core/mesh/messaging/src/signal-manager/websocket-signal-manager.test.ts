//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { afterAll, beforeAll, describe, test, openAndClose } from '@dxos/test';

import { WebsocketSignalManager } from './websocket-signal-manager';

describe.only('WebSocketSignalManager', () => {
  let broker1: TestBroker;
  let broker2: TestBroker;

  beforeAll(async () => {
    broker1 = await createTestBroker(5001);
    broker2 = await createTestBroker(5002);
  });

  afterAll(async () => {
    await broker1.stop();
    await broker2.stop();
  });

  const expectPeerAvailable = (client: WebsocketSignalManager, expectedTopic: PublicKey, peer: PublicKey) =>
    client.swarmEvent.waitFor(
      ({ swarmEvent, topic }) =>
        !!swarmEvent.peerAvailable && peer.equals(swarmEvent.peerAvailable.peer) && expectedTopic.equals(topic)
    );

  test.only('join swarm with two brokers', async () => {
    const client1 = new WebsocketSignalManager([broker1.url(), broker2.url()]);
    const client2 = new WebsocketSignalManager([broker1.url()]);
    const client3 = new WebsocketSignalManager([broker2.url()]);
    await openAndClose(client1, client2, client3);

    const [topic, peer1, peer2, peer3] = PublicKey.randomSequence();

    const joined12 = expectPeerAvailable(client1, topic, peer2);
    const joined13 = expectPeerAvailable(client1, topic, peer3);
    const joined21 = expectPeerAvailable(client2, topic, peer1);
    const joined31 = expectPeerAvailable(client3, topic, peer1);

    await client1.join({ topic, peerId: peer1 });
    await client2.join({ topic, peerId: peer2 });
    await client3.join({ topic, peerId: peer3 });

    await Promise.all([joined12, joined13, joined21, joined31]);
  });

  test('works with one broken server', async () => {
    const client1 = new WebsocketSignalManager(['ws://broken.server/signal', broker1.url()]);
    const client2 = new WebsocketSignalManager(['ws://broken.server/signal', broker1.url()]);
    await openAndClose(client1, client2);

    const [topic, peer1, peer2] = PublicKey.randomSequence();

    const joined12 = expectPeerAvailable(client1, topic, peer2);
    const joined21 = expectPeerAvailable(client2, topic, peer1);

    await client1.join({ topic, peerId: peer1 });
    await client2.join({ topic, peerId: peer2 });

    await Promise.all([joined12, joined21]);
  });

  test('join two swarms with a broken signal server', async () => {
    const client1 = new WebsocketSignalManager(['ws://broken.server/signal', broker1.url()]);
    const client2 = new WebsocketSignalManager(['ws://broken.server/signal', broker2.url()]);
    await openAndClose(client1, client2);

    const [topic1, topic2, peer1, peer2] = PublicKey.randomSequence();

    const joined112 = expectPeerAvailable(client1, topic1, peer2);
    const joined121 = expectPeerAvailable(client2, topic1, peer1);

    await client1.join({ topic: topic1, peerId: peer1 });
    await client2.join({ topic: topic1, peerId: peer2 });
    await Promise.all([joined112, joined121]);

    const joined212 = expectPeerAvailable(client1, topic2, peer2);
    const joined221 = expectPeerAvailable(client2, topic2, peer1);

    await client1.join({ topic: topic2, peerId: peer1 });
    await client2.join({ topic: topic2, peerId: peer2 });
    await Promise.all([joined212, joined221]);
  });
});
