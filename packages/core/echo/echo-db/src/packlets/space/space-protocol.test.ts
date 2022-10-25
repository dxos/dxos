//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import {
  MemorySignalManagerContext,
  MemorySignalManager
} from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { afterTest } from '@dxos/testutils';

import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER } from './auth-plugin';
import { SpaceProtocol } from './space-protocol';

const signalContext = new MemorySignalManagerContext();

describe('space/space-protocol', function () {
  it('two peers discover each other', async function () {
    const topic = PublicKey.random();

    const peerId1 = PublicKey.random();
    const networkManager1 = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory
    });
    const protocol1 = new SpaceProtocol(networkManager1, topic, {
      peerKey: peerId1,
      credentialProvider: MOCK_AUTH_PROVIDER,
      credentialAuthenticator: MOCK_AUTH_VERIFIER
    });

    const peerId2 = PublicKey.random();
    const networkManager2 = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory
    });
    const protocol2 = new SpaceProtocol(networkManager2, topic, {
      peerKey: peerId2,
      credentialProvider: MOCK_AUTH_PROVIDER,
      credentialAuthenticator: MOCK_AUTH_VERIFIER
    });

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    await waitForExpect(() => {
      expect(protocol1.peers).toContainEqual(peerId2);
      expect(protocol2.peers).toContainEqual(peerId1);
    });
  });

  it('failing authentication', async function () {
    const topic = PublicKey.random();

    const peerId1 = PublicKey.random();
    const networkManager1 = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory
    });
    const protocol1 = new SpaceProtocol(networkManager1, topic, {
      peerKey: peerId1,
      credentialProvider: MOCK_AUTH_PROVIDER,
      credentialAuthenticator: async () => false // Reject everyone.
    });

    const authFailedPromise = protocol1.authenticationFailed.waitForCount(1);

    const peerId2 = PublicKey.random();
    const networkManager2 = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory
    });
    const protocol2 = new SpaceProtocol(networkManager2, topic, {
      peerKey: peerId2,
      credentialProvider: MOCK_AUTH_PROVIDER,
      credentialAuthenticator: MOCK_AUTH_VERIFIER
    });

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    await authFailedPromise;
  });
});
