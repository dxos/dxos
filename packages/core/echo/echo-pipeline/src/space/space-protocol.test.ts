//
// Copyright 2022 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, SwarmNetworkManager } from '@dxos/network-manager';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { BlobStore } from '@dxos/teleport-extension-object-sync';
import { Timeframe } from '@dxos/timeframe';

import { TestAgentBuilder, TestFeedBuilder } from '../testing';

import { AuthStatus, MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, SpaceProtocol } from './space-protocol';

describe('space/space-protocol', () => {
  // Flaky.
  test('two peers discover each other via presence', async () => {
    const builder = new TestAgentBuilder();
    onTestFinished(async () => {
      await builder.close();
    });
    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const gossip1 = peer1.createGossip();
    const presence1 = peer1.createPresence(gossip1);
    await presence1.open();
    const protocol1 = peer1.createSpaceProtocol(topic, gossip1);

    const peer2 = await builder.createPeer();
    const gossip2 = peer2.createGossip();
    const presence2 = peer2.createPresence(gossip2);
    await presence2.open();
    const protocol2 = peer2.createSpaceProtocol(topic, gossip2);

    await protocol1.start();
    onTestFinished(() => protocol1.stop());

    await protocol2.start();
    onTestFinished(() => protocol2.stop());

    await expect
      .poll(() => presence1.getPeersOnline().some(({ identityKey }) => identityKey.equals(peer2.identityKey)), {
        timeout: 1_000,
      })
      .toBeTruthy();
    await expect
      .poll(() => presence2.getPeersOnline().some(({ identityKey }) => identityKey.equals(peer1.identityKey)), {
        timeout: 1_000,
      })
      .toBeTruthy();
  });

  test('failing authentication', async () => {
    const [topic, peerId1, peerId2] = PublicKey.randomSequence();
    const signalContext = new MemorySignalManagerContext();

    const protocol1 = new SpaceProtocol({
      topic,
      swarmIdentity: {
        peerKey: peerId1,
        identityKey: peerId1,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: async () => false, // Reject everyone.
      },
      blobStore: new BlobStore(createStorage({ type: StorageType.RAM }).createDirectory()),
      networkManager: new SwarmNetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory,
        peerInfo: {
          peerKey: peerId1.toHex(),
          identityKey: peerId1.toHex(),
        },
      }),
    });

    const protocol2 = new SpaceProtocol({
      topic,
      swarmIdentity: {
        peerKey: peerId2,
        identityKey: peerId2,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER,
      },
      blobStore: new BlobStore(createStorage({ type: StorageType.RAM }).createDirectory()),
      networkManager: new SwarmNetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory,
        peerInfo: {
          peerKey: peerId2.toHex(),
          identityKey: peerId2.toHex(),
        },
      }),
    });

    await protocol1.start();
    onTestFinished(() => protocol1.stop());

    await protocol2.start();
    onTestFinished(() => protocol2.stop());

    await expect.poll(() => protocol1.sessions.get(peerId2)?.authStatus).toEqual(AuthStatus.FAILURE);
  });

  test('replicates a feed', async () => {
    const builder = new TestAgentBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const protocol1 = peer1.createSpaceProtocol(topic);

    const peer2 = await builder.createPeer();
    const protocol2 = peer2.createSpaceProtocol(topic);

    await protocol1.start();
    await protocol2.start();

    onTestFinished(() => protocol1.stop());
    onTestFinished(() => protocol2.stop());

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
    // Received message appended before replication.
    await expect.poll(() => feed2.properties.length).toEqual(1);

    // TODO(burdon): Append batch of messages.
    await feed1.append({ timeframe: new Timeframe() });
    // Received message appended after replication.
    await expect.poll(() => feed2.properties.length).toEqual(2);
  });
});
