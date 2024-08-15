//
// Copyright 2024 DXOS.org
//
import { sleep } from '@dxos/async';
import { MessengerClient } from '@dxos/edge-client';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { describe, openAndClose, test } from '@dxos/test';

import { EdgeSignal } from './edge-signal-manager';

describe.only('EdgeSignalManager', () => {
  test('two peers discover each other', async () => {
    const topic = PublicKey.random();
    const peer1 = await setupPeer();
    const peer2 = await setupPeer();

    peer1.edgeSignal.swarmEvent.on(({ topic, swarmEvent }) => {
      log.info('peer1', { topic, swarmEvent });
    });
    peer2.edgeSignal.swarmEvent.on(({ topic, swarmEvent }) => {
      log.info('peer2', { topic, swarmEvent });
    });

    await peer1.edgeSignal.join({ topic, peerId: peer1.deviceKey });
    await peer2.edgeSignal.join({ topic, peerId: peer2.deviceKey });

    await sleep(4000);
  });

  const setupPeer = async () => {
    const [identityKey, deviceKey] = PublicKey.randomSequence();

    const client = new MessengerClient(identityKey, deviceKey, { socketEndpoint: 'ws://localhost:8787' });
    await openAndClose(client);
    const edgeSignal = new EdgeSignal({ messengerClient: client });
    await openAndClose(edgeSignal);

    return { identityKey, deviceKey, client, edgeSignal };
  };
});
