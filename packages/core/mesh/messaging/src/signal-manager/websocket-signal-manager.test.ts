//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { runTestSignalServer, type SignalServerRunner } from '@dxos/signal';
import { afterAll, beforeAll, describe, test, openAndClose } from '@dxos/test';

import { WebsocketSignalManager } from './websocket-signal-manager';

describe('WebSocketSignalManager', () => {
  let broker1: SignalServerRunner;
  let broker2: SignalServerRunner;

  beforeAll(async () => {
    broker1 = await runTestSignalServer({ port: 5001 });
    broker2 = await runTestSignalServer({ port: 5002 });
  });

  afterAll(() => {
    void broker1.stop();
    void broker2.stop();
  });

  const expectPeerAvailable = (client: WebsocketSignalManager, expectedTopic: PublicKey, peer: PublicKey) =>
    client.swarmEvent.waitFor(
      ({ swarmEvent, topic }) =>
        !!swarmEvent.peerAvailable && peer.equals(swarmEvent.peerAvailable.peer) && expectedTopic.equals(topic),
    );

  const expectReceivedMessage = (client: WebsocketSignalManager, expectedMessage: any) => {
    return client.onMessage.waitFor(
      (msg) =>
        msg.author.equals(expectedMessage.author) &&
        msg.recipient.equals(expectedMessage.recipient) &&
        PublicKey.from(msg.payload.value).equals(expectedMessage.payload.value),
    );
  };

  test('join swarm with two brokers', async () => {
    const client1 = new WebsocketSignalManager([{ server: broker1.url() }, { server: broker2.url() }]);
    const client2 = new WebsocketSignalManager([{ server: broker1.url() }]);
    const client3 = new WebsocketSignalManager([{ server: broker2.url() }]);
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
  })
    .timeout(1_000)
    .retries(2);

  test('join single swarm with doubled brokers', async () => {
    const client1 = new WebsocketSignalManager([{ server: broker1.url() }, { server: broker2.url() }]);
    const client2 = new WebsocketSignalManager([{ server: broker1.url() }, { server: broker2.url() }]);
    await openAndClose(client1, client2);

    const [topic, peer1, peer2] = PublicKey.randomSequence();

    const joined12 = expectPeerAvailable(client1, topic, peer2);
    const joined21 = expectPeerAvailable(client2, topic, peer1);

    await client1.join({ topic, peerId: peer1 });
    await client2.join({ topic, peerId: peer2 });

    await asyncTimeout(Promise.all([joined12, joined21]), 1_000);

    const message = {
      author: peer1,
      recipient: peer2,
      payload: { type_url: 'google.protobuf.Any', value: Uint8Array.from([1, 2, 3]) },
    };

    const received = expectReceivedMessage(client2, message);
    await client2.subscribeMessages(peer2);
    await sleep(50);
    await client1.sendMessage(message);

    await asyncTimeout(received, 1_000);
  })
    .timeout(1_000)
    .retries(2);

  test('works with one broken server', async () => {
    const client1 = new WebsocketSignalManager([{ server: 'ws://broken.server/signal' }, { server: broker1.url() }]);
    const client2 = new WebsocketSignalManager([{ server: 'ws://broken.server/signal' }, { server: broker1.url() }]);
    await openAndClose(client1, client2);

    const [topic, peer1, peer2] = PublicKey.randomSequence();

    const joined12 = expectPeerAvailable(client1, topic, peer2);
    const joined21 = expectPeerAvailable(client2, topic, peer1);

    await client1.join({ topic, peerId: peer1 });
    await client2.join({ topic, peerId: peer2 });

    await Promise.all([joined12, joined21]);
  })
    .timeout(1_000)
    .retries(2);

  test('join two swarms with a broken signal server', async () => {
    const client1 = new WebsocketSignalManager([{ server: 'ws://broken.server/signal' }, { server: broker1.url() }]);
    const client2 = new WebsocketSignalManager([{ server: 'ws://broken.server/signal' }, { server: broker1.url() }]);
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
  })
    .timeout(1_000)
    .retries(2);
});
