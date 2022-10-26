//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=browser

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext, MemorySignalManager, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';
import { Timeframe } from '@dxos/timeframe';

import { valueEncoding } from '../common';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER } from './auth-plugin';
import { ReplicatorPlugin } from './replicator-plugin';
import { SpaceProtocol } from './space-protocol';

const signalContext = new MemorySignalManagerContext();

// Signal server will be started by the setup script.
const SIGNAL_URL = 'ws://localhost:4000/.well-known/dx/signal';

describe('space/space-protocol', function () {
  it('two peers discover each other', async function () {
    const topic = PublicKey.random();

    const peerId1 = PublicKey.random();
    const protocol1 = new SpaceProtocol(
      new NetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory
      }),
      topic,
      {
        peerKey: peerId1,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      }
    );

    const peerId2 = PublicKey.random();
    const protocol2 = new SpaceProtocol(
      new NetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory
      }),
      topic,
      {
        peerKey: peerId2,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      }
    );

    await protocol1.start();
    await protocol2.start();

    afterTest(() => protocol1.stop());
    afterTest(() => protocol2.stop());

    await waitForExpect(() => {
      expect(protocol1.peers).toContainEqual(peerId2);
      expect(protocol2.peers).toContainEqual(peerId1);
    });
  });

  it('replicates a feed', async function () {
    const signalContext = new MemorySignalManagerContext();
    const topic = PublicKey.random();

    const peerId1 = PublicKey.random();
    const replicator1 = new ReplicatorPlugin();
    const protocol1 = new SpaceProtocol(
      new NetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory
      }),
      topic,
      {
        peerKey: peerId1,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      [replicator1]
    );

    const peerId2 = PublicKey.random();
    const replicator2 = new ReplicatorPlugin();
    const protocol2 = new SpaceProtocol(
      new NetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory
      }),
      topic,
      {
        peerKey: peerId2,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      [replicator2]
    );

    await protocol1.start();
    await protocol2.start();

    afterTest(() => protocol1.stop());
    afterTest(() => protocol2.stop());

    const keyring1 = new Keyring();
    const feedStore1 = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: createStorage({ type: StorageType.RAM }).createDirectory(),
        signer: keyring1,
        hypercore: {
          valueEncoding
        }
      })
    });

    const feed1 = await feedStore1.openFeed(await keyring1.createKey(), {
      writable: true
    });
    await feed1.append({
      timeframe: new Timeframe()
    });

    const keyring2 = new Keyring();
    const feedStore2 = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: createStorage({ type: StorageType.RAM }).createDirectory(),
        signer: keyring2,
        hypercore: {
          valueEncoding
        }
      })
    });

    const feed2 = await feedStore2.openFeed(feed1.key);

    await replicator1.addFeed(feed1);
    await replicator2.addFeed(feed2);

    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(1);
    });

    await feed1.append({
      timeframe: new Timeframe()
    });
    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(2);
    });
  });

  it('replicates a feed through a webrtc connection', async function () {
    if (mochaExecutor.environment === 'webkit') {
      this.skip();
    }

    // Some storage drivers may break when there are multiple storage instances.
    const storage = createStorage();

    const keyring = new Keyring();
    const topic = await keyring.createKey();

    const peerId1 = await keyring.createKey();
    const replicator1 = new ReplicatorPlugin();
    const protocol1 = new SpaceProtocol(
      new NetworkManager({
        signalManager: new WebsocketSignalManager([SIGNAL_URL]),
        transportFactory: createWebRTCTransportFactory()
      }),
      topic,
      {
        peerKey: peerId1,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      [replicator1]
    );

    const peerId2 = await keyring.createKey();
    const replicator2 = new ReplicatorPlugin();
    const protocol2 = new SpaceProtocol(
      new NetworkManager({
        signalManager: new WebsocketSignalManager([SIGNAL_URL]),
        transportFactory: createWebRTCTransportFactory()
      }),
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

    const keyring1 = new Keyring();
    const feedStore1 = new FeedStore<FeedMessage>({
      factory: new FeedFactory({
        root: storage.createDirectory('feeds1'),
        signer: keyring1,
        hypercore: {
          valueEncoding
        }
      })
    });

    const feed1 = await feedStore1.openFeed(await keyring1.createKey(), {
      writable: true
    });
    await feed1.append({
      timeframe: new Timeframe()
    });

    const keyring2 = new Keyring();
    const feedStore2 = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory('feeds2'),
        signer: keyring2,
        hypercore: {
          valueEncoding
        }
      })
    });

    const feed2 = await feedStore2.openFeed(feed1.key);

    await replicator1.addFeed(feed1);
    await replicator2.addFeed(feed2);

    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(1);
    });

    await feed1.append({
      timeframe: new Timeframe()
    });
    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(2);
    });
  });
});
