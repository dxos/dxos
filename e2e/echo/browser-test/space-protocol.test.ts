//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext, MemorySignalManager, WebsocketSignalManager } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { afterTest } from '@dxos/testutils';

import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, SpaceProtocol, ReplicatorPlugin, codec } from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { Keyring } from '@dxos/keyring';
import { Timeframe } from '@dxos/protocols';

const signalContext = new MemorySignalManagerContext();

describe('space/space-protocol', () => {
  it('two peers discover each other', async () => {
    const topic = PublicKey.random();

    const peerId1 = PublicKey.random();
    const networkManager1 = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
    const protocol1 = new SpaceProtocol(
      networkManager1,
      topic,
      {
        peerKey: peerId1,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      []
    );

    const peerId2 = PublicKey.random();
    const networkManager2 = new NetworkManager({ signalManager: new MemorySignalManager(signalContext) });
    const protocol2 = new SpaceProtocol(
      networkManager2,
      topic,
      {
        peerKey: peerId2,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      []
    );

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    await waitForExpect(() => {
      expect(protocol1.peers).toContainEqual(peerId2);
      expect(protocol2.peers).toContainEqual(peerId1);
    });
  });

  it('replicates a feed', async () => {
    const signalContext = new MemorySignalManagerContext();
    const topic = PublicKey.random();

    const peerId1 = PublicKey.random();
    const networkManager1 = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext)
    });
    const replicator1 = new ReplicatorPlugin();
    const protocol1 = new SpaceProtocol(
      networkManager1,
      topic,
      {
        peerKey: peerId1,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      [replicator1]
    );

    const peerId2 = PublicKey.random();
    const networkManager2 = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext)
    });
    const replicator2 = new ReplicatorPlugin();
    const protocol2 = new SpaceProtocol(
      networkManager2,
      topic,
      {
        peerKey: peerId2,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      [replicator2]
    );

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    const feedStore1 = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
    const keyring1 = new Keyring();
    const feed1 = await feedStore1.openReadWriteFeedWithSigner(await keyring1.createKey(), keyring1);

    await feed1.append({
      timeframe: new Timeframe()
    });

    const feedStore2 = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
    const feed2 = await feedStore2.openReadOnlyFeed(feed1.key);

    await replicator1.addFeed(feed1);
    await replicator2.addFeed(feed2);

    await waitForExpect(() => {
      expect(feed2.feed.length).toEqual(1);
    });

    await feed1.append({
      timeframe: new Timeframe()
    });
    await waitForExpect(() => {
      expect(feed2.feed.length).toEqual(2);
    });
  });

  it('replicates a feed through a webrtc connection', async () => {
    // Some storage drivers may break when there are multiple storage instances.
    const storage = createStorage()

    const keyring = new Keyring()

    const topic = await keyring.createKey();

    const peerId1 = await keyring.createKey();
    const networkManager1 = new NetworkManager({
      signalManager: new WebsocketSignalManager(['ws://localhost:4000/.well-known/dx/signal'])
    });
    const replicator1 = new ReplicatorPlugin();
    const protocol1 = new SpaceProtocol(
      networkManager1,
      topic,
      {
        peerKey: peerId1,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      [replicator1]
    );

    const peerId2 = await keyring.createKey();
    const networkManager2 = new NetworkManager({
      signalManager: new WebsocketSignalManager(['ws://localhost:4000/.well-known/dx/signal'])
    });
    const replicator2 = new ReplicatorPlugin();
    const protocol2 = new SpaceProtocol(
      networkManager2,
      topic,
      {
        peerKey: peerId2,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      [replicator2]
    );

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    const feedStore1 = new FeedStore(storage.createDirectory('feeds1'), { valueEncoding: codec });
    const keyring1 = new Keyring();
    const feed1 = await feedStore1.openReadWriteFeedWithSigner(await keyring1.createKey(), keyring1);

    await feed1.append({
      timeframe: new Timeframe()
    });

    const feedStore2 = new FeedStore(storage.createDirectory('feeds2'), { valueEncoding: codec });
    const feed2 = await feedStore2.openReadOnlyFeed(feed1.key);

    await replicator1.addFeed(feed1);
    await replicator2.addFeed(feed2);

    await waitForExpect(() => {
      expect(feed2.feed.length).toEqual(1);
    });

    await feed1.append({
      timeframe: new Timeframe()
    });
    await waitForExpect(() => {
      expect(feed2.feed.length).toEqual(2);
    });
  });
});
