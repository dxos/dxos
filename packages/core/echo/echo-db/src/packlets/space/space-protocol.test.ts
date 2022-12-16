//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { Presence } from '@dxos/teleport-extension-presence';
import { describe, test, afterTest } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';

import { TestAgentBuilder, TestFeedBuilder } from '../testing';
import { AuthStatus, MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, SpaceProtocol } from './space-protocol';

describe('space/space-protocol', () => {
  test('two peers discover each other via presence', async () => {
    const builder = new TestAgentBuilder();
    afterTest(async () => await builder.close());
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
      expect(peer1.presence.getPeersOnline().map(({ peerId }) => peerId)).toContainEqual(peer2.deviceKey);
      expect(peer2.presence.getPeersOnline().map(({ peerId }) => peerId)).toContainEqual(peer1.deviceKey);
    }, 1_000);
  });

  test('failing authentication', async () => {
    const [topic, peerId1, peerId2] = PublicKey.randomSequence();
    const signalContext = new MemorySignalManagerContext();

    const protocol1 = new SpaceProtocol({
      topic,
      swarmIdentity: {
        peerKey: peerId1,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: async () => false // Reject everyone.
      },
      networkManager: new NetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory
      }),
      presence: new Presence({
        localPeerId: peerId1,
        announceInterval: 100,
        offlineTimeout: 1_000,
        identityKey: PublicKey.random()
      })
    });

    const protocol2 = new SpaceProtocol({
      topic,
      swarmIdentity: {
        peerKey: peerId2,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      networkManager: new NetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory
      }),
      presence: new Presence({
        localPeerId: peerId2,
        announceInterval: 100,
        offlineTimeout: 1_000,
        identityKey: PublicKey.random()
      })
    });

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    await waitForExpect(() => {
      expect(protocol1.sessions.get(peerId2)?.authStatus).toEqual(AuthStatus.FAILURE);
    });
  });

  test('replicates a feed', async () => {
    const builder = new TestAgentBuilder();
    afterTest(async () => await builder.close());

    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const protocol1 = peer1.createSpaceProtocol(topic);

    const peer2 = await builder.createPeer();
    const protocol2 = peer2.createSpaceProtocol(topic);

    await protocol1.start();
    await protocol2.start();

    afterTest(() => protocol1.stop());
    afterTest(() => protocol2.stop());

    //
    // Create feeds.
    //

    const builder1 = new TestFeedBuilder();
    const feedStore1 = builder1.createFeedStore();

    const builder2 = new TestFeedBuilder();
    const feedStore2 = builder2.createFeedStore();

    const feed1 = await feedStore1.openFeed(await builder1.keyring.createKey(), { writable: true });
    const feed2 = await feedStore2.openFeed(feed1.key);

    await protocol1.addFeed(feed1);
    await protocol2.addFeed(feed2);

    //
    // Append message.
    //

    // TODO(burdon): Append batch of messages.
    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      // Received message appended before replication.
      expect(feed2.properties.length).toEqual(1);
    });

    // TODO(burdon): Append batch of messages.
    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      // Received message appended after replication.
      expect(feed2.properties.length).toEqual(2);
    });
  });
});
