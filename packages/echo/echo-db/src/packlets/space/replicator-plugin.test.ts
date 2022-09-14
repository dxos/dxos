import { it as test } from 'mocha'
import expect from 'expect'
import { PublicKey, Timeframe } from '@dxos/protocols';
import { NetworkManager } from '@dxos/network-manager';
import { MOCK_CREDENTIAL_AUTHENTICATOR, MOCK_CREDENTIAL_PROVIDER, SpaceProtocol } from './space-protocol';
import { afterTest } from '@dxos/testutils';
import { ReplicatorPlugin } from './replicator-plugin';
import { FeedStore } from '@dxos/feed-store';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { codec } from '@dxos/echo-protocol';
import { Keyring } from '@dxos/keyring';
import waitForExpect from 'wait-for-expect';

describe('space/replicator-plugin', () => {
  it.only('replicates a feed', async () => {
    const topic = PublicKey.random();

    const peerId1 = PublicKey.random();
    const networkManager1 = new NetworkManager();
    const replicator1 = new ReplicatorPlugin();
    const protocol1 = new SpaceProtocol(
      networkManager1,
      topic,
      {
        peerKey: peerId1,
        credentialProvider: MOCK_CREDENTIAL_PROVIDER,
        credentialAuthenticator: MOCK_CREDENTIAL_AUTHENTICATOR
      },
      [replicator1]
    );

    const peerId2 = PublicKey.random();
    const networkManager2 = new NetworkManager();
    const replicator2 = new ReplicatorPlugin();
    const protocol2 = new SpaceProtocol(
      networkManager2,
      topic,
      {
        peerKey: peerId2,
        credentialProvider: MOCK_CREDENTIAL_PROVIDER,
        credentialAuthenticator: MOCK_CREDENTIAL_AUTHENTICATOR
      },
      [replicator2]
    );

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());


    const feedStore1 = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
    const keyring1 = new Keyring()
    const feed1 = await feedStore1.openReadWriteFeedWithSigner(await keyring1.createKey(), keyring1);

    await feed1.append({
      timeframe: new Timeframe(),
    })

    const feedStore2 = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
    const feed2 = await feedStore2.openReadOnlyFeed(feed1.key);

    await replicator1.addFeed(feed1);
    await replicator2.addFeed(feed2);

    await waitForExpect(() => {
      expect(feed2.feed.length).toEqual(1);
    })

    await feed1.append({
      timeframe: new Timeframe(),
    })
    await waitForExpect(() => {
      expect(feed2.feed.length).toEqual(2);
    })
  });
})