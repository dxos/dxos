//
// Copyright 2023 DXOS.org
//

import { afterAll, beforeAll, describe, test } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { type SignalServerRunner, runTestSignalServer } from '@dxos/signal';
import { openAndClose } from '@dxos/test-utils';

import { createMessage, expectPeerAvailable, expectReceivedMessage } from '../testing';

import { WebsocketSignalManager } from './websocket-signal-manager';

describe.skip('WebSocketSignalManager', () => {
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

  test('join swarm with two brokers', { timeout: 1_000 }, async () => {
    const client1 = new WebsocketSignalManager([{ server: broker1.url() }, { server: broker2.url() }]);
    const client2 = new WebsocketSignalManager([{ server: broker1.url() }]);
    const client3 = new WebsocketSignalManager([{ server: broker2.url() }]);
    await openAndClose(client1, client2, client3);

    const [topic, peer1, peer2, peer3] = PublicKey.randomSequence();

    const joined12 = expectPeerAvailable(client1, topic, { peerKey: peer2.toHex() });
    const joined13 = expectPeerAvailable(client1, topic, { peerKey: peer3.toHex() });
    const joined21 = expectPeerAvailable(client2, topic, { peerKey: peer1.toHex() });
    const joined31 = expectPeerAvailable(client3, topic, { peerKey: peer1.toHex() });

    await client1.join({ topic, peer: { peerKey: peer1.toHex() } });
    await client2.join({ topic, peer: { peerKey: peer2.toHex() } });
    await client3.join({ topic, peer: { peerKey: peer3.toHex() } });

    await Promise.all([joined12, joined13, joined21, joined31]);
  });

  test('join single swarm with doubled brokers', { timeout: 1_000 }, async () => {
    const client1 = new WebsocketSignalManager([{ server: broker1.url() }, { server: broker2.url() }]);
    const client2 = new WebsocketSignalManager([{ server: broker1.url() }, { server: broker2.url() }]);
    await openAndClose(client1, client2);

    const [topic, peer1, peer2] = PublicKey.randomSequence();

    const joined12 = expectPeerAvailable(client1, topic, { peerKey: peer2.toHex() });
    const joined21 = expectPeerAvailable(client2, topic, { peerKey: peer1.toHex() });

    await client1.join({ topic, peer: { peerKey: peer1.toHex() } });
    await client2.join({ topic, peer: { peerKey: peer2.toHex() } });

    await asyncTimeout(Promise.all([joined12, joined21]), 1_000);

    const message = createMessage({ peerKey: peer1.toHex() }, { peerKey: peer2.toHex() });

    const received = expectReceivedMessage(client2.onMessage, message);
    await client2.subscribeMessages({ peerKey: peer2.toHex() });
    await sleep(50);
    await client1.sendMessage(message);

    await asyncTimeout(received, 1_000);
  });

  test('works with one broken server', { timeout: 1_000 }, async () => {
    const client1 = new WebsocketSignalManager([{ server: 'ws://broken.server/signal' }, { server: broker1.url() }]);
    const client2 = new WebsocketSignalManager([{ server: 'ws://broken.server/signal' }, { server: broker1.url() }]);
    await openAndClose(client1, client2);

    const [topic, peer1, peer2] = PublicKey.randomSequence();

    const joined12 = expectPeerAvailable(client1, topic, { peerKey: peer2.toHex() });
    const joined21 = expectPeerAvailable(client2, topic, { peerKey: peer1.toHex() });

    await client1.join({ topic, peer: { peerKey: peer1.toHex() } });
    await client2.join({ topic, peer: { peerKey: peer2.toHex() } });

    await Promise.all([joined12, joined21]);
  });

  test('join two swarms with a broken signal server', { timeout: 1_000 }, async () => {
    const client1 = new WebsocketSignalManager([{ server: 'ws://broken.server/signal' }, { server: broker1.url() }]);
    const client2 = new WebsocketSignalManager([{ server: 'ws://broken.server/signal' }, { server: broker1.url() }]);
    await openAndClose(client1, client2);

    const [topic1, topic2, peer1, peer2] = PublicKey.randomSequence();

    const joined112 = expectPeerAvailable(client1, topic1, { peerKey: peer2.toHex() });
    const joined121 = expectPeerAvailable(client2, topic1, { peerKey: peer1.toHex() });

    await client1.join({ topic: topic1, peer: { peerKey: peer1.toHex() } });
    await client2.join({ topic: topic1, peer: { peerKey: peer2.toHex() } });
    await Promise.all([joined112, joined121]);

    const joined212 = expectPeerAvailable(client1, topic2, { peerKey: peer2.toHex() });
    const joined221 = expectPeerAvailable(client2, topic2, { peerKey: peer1.toHex() });

    await client1.join({ topic: topic2, peer: { peerKey: peer1.toHex() } });
    await client2.join({ topic: topic2, peer: { peerKey: peer2.toHex() } });
    await Promise.all([joined212, joined221]);
  });
});
