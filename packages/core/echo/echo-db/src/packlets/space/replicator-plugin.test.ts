//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';
import { Timeframe } from '@dxos/timeframe';

import { valueEncoding } from '../common';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER } from './auth-plugin';
import { ReplicatorPlugin } from './replicator-plugin';
import { SpaceProtocol } from './space-protocol';

describe('space/replicator-plugin', function () {
  // TODO(burdon): Exact same code as space-protocol.browser.test
  it.only('replicates a feed', async function () {
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
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    const keyring1 = new Keyring();
    const feedStore1 = new FeedStore({
      factory: new FeedFactory({
        root: createStorage({ type: StorageType.RAM }).createDirectory(),
        signer: keyring1,
        hypercore: {
          valueEncoding
        }
      })
    });

    const keyring2 = new Keyring();
    const feedStore2 = new FeedStore({
      factory: new FeedFactory({
        root: createStorage({ type: StorageType.RAM }).createDirectory(),
        signer: keyring2,
        hypercore: {
          valueEncoding
        }
      })
    });

    const feed1 = await feedStore1.openFeed(await keyring1.createKey(), { writable: true });
    await feed1.append({ timeframe: new Timeframe() });

    const feed2 = await feedStore2.openFeed(feed1.key);

    await replicator1.addFeed(feed1);
    await replicator2.addFeed(feed2);

    await waitForExpect(() => {
      // Received message appended before replication.
      expect(feed2.properties.length).toEqual(1);
    });

    await feed1.append({ timeframe: new Timeframe() });

    await waitForExpect(() => {
      // Received message appended after replication.
      expect(feed2.properties.length).toEqual(2);
    });
  });
});
