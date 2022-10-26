//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { afterTest } from '@dxos/testutils';

import { SpaceProtocol } from './space-protocol';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, TestAgentBuilder } from './testing';

describe('space/space-protocol', function () {
  it('two peers discover each other', async function () {
    const builder = new TestAgentBuilder();
    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const protocol1 = peer1.createSpaceProtocol(topic);

    const peer2 = await builder.createPeer();
    const protocol2 = peer2.createSpaceProtocol(topic);

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    await waitForExpect(() => {
      expect(protocol1.peers).toContainEqual(peer2.deviceKey);
      expect(protocol2.peers).toContainEqual(peer1.deviceKey);
    });
  });

  it('failing authentication', async function () {
    const signalContext = new MemorySignalManagerContext();
    const topic = PublicKey.random();

    const peerId1 = PublicKey.random();
    const protocol1 = new SpaceProtocol({
      topic,
      identity: {
        peerKey: peerId1,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: async () => false // Reject everyone.
      },
      networkManager: new NetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory
      })
    });

    const authFailedPromise = protocol1.authenticationFailed.waitForCount(1); // TODO(burdon): Move to after?

    const peerId2 = PublicKey.random();
    const protocol2 = new SpaceProtocol({
      topic,
      identity: {
        peerKey: peerId2,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      networkManager: new NetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory
      })
    });

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    await authFailedPromise;
  });
});
