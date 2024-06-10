//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Context } from '@dxos/context';
import { valueEncoding, MetadataStore, SpaceManager, AuthStatus, SnapshotStore } from '@dxos/echo-pipeline';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, SwarmNetworkManager } from '@dxos/network-manager';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage, type Storage, StorageType } from '@dxos/random-access-storage';
import { BlobStore } from '@dxos/teleport-extension-object-sync';
import { describe, test, afterTest } from '@dxos/test';

import { IdentityManager } from './identity-manager';

describe('identity/identity-manager', () => {
  const setupPeer = async ({
    signalContext = new MemorySignalManagerContext(),
    storage = createStorage({ type: StorageType.RAM }),
  }: {
    signalContext?: MemorySignalManagerContext;
    storage?: Storage;
  } = {}) => {
    const metadataStore = new MetadataStore(storage.createDirectory('metadata'));
    const blobStore = new BlobStore(storage.createDirectory('blobs'));

    const keyring = new Keyring(storage.createDirectory('keyring'));
    const feedStore = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory('feeds'),
        signer: keyring,
        hypercore: {
          valueEncoding,
        },
      }),
    });

    afterTest(() => feedStore.close());

    const networkManager = new SwarmNetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory,
    });
    const spaceManager = new SpaceManager({
      feedStore,
      networkManager,
      blobStore,
      metadataStore,
      snapshotStore: new SnapshotStore(storage.createDirectory('snapshots')),
    });
    const identityManager = new IdentityManager(metadataStore, keyring, feedStore, spaceManager);

    return {
      metadataStore,
      identityManager,
      feedStore,
      keyring,
    };
  };

  test('creates identity', async () => {
    const { identityManager } = await setupPeer();
    await identityManager.open(new Context());
    afterTest(() => identityManager.close());

    const identity = await identityManager.createIdentity();
    expect(identity).to.exist;
  });

  test('reload from storage', async () => {
    const storage = createStorage({ type: StorageType.RAM });

    const peer1 = await setupPeer({ storage });
    await peer1.metadataStore.load();
    await peer1.identityManager.open(new Context());
    const identity1 = await peer1.identityManager.createIdentity();
    await peer1.identityManager.close();
    await peer1.feedStore.close();
    await peer1.metadataStore.close();

    const peer2 = await setupPeer({ storage });
    await peer2.metadataStore.load();
    await peer2.identityManager.open(new Context());

    expect(peer2.identityManager.identity).to.exist;
    expect(peer2.identityManager.identity!.identityKey).to.deep.eq(identity1.identityKey);
    expect(peer2.identityManager.identity!.deviceKey).to.deep.eq(identity1.deviceKey);

    // TODO(dmaretskyi): Check that identity is "alive" (space is working and can write mutations).
  });

  test('update profile', async () => {
    const { identityManager } = await setupPeer();
    await identityManager.open(new Context());
    afterTest(() => identityManager.close());

    const identity = await identityManager.createIdentity();
    expect(identity.profileDocument?.displayName).to.be.undefined;
    await identityManager.updateProfile({ displayName: 'Example' });
    expect(identity.profileDocument?.displayName).to.equal('Example');
  });

  test('admit another device', async () => {
    const signalContext = new MemorySignalManagerContext();

    const peer1 = await setupPeer({ signalContext });
    const identity1 = await peer1.identityManager.createIdentity();

    const peer2 = await setupPeer({ signalContext });

    const deviceKey = await peer2.keyring.createKey();
    const controlFeedKey = await peer2.keyring.createKey();
    const dataFeedKey = await peer2.keyring.createKey();

    await identity1.controlPipeline.writer.write({
      credential: {
        credential: await identity1.getIdentityCredentialSigner().createCredential({
          subject: deviceKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            identityKey: identity1.identityKey,
            deviceKey,
          },
        }),
      },
    });

    // Identity2 is not yet ready at this point. Peer1 needs to admit peer2 device key and feed keys.
    const identity2 = await peer2.identityManager.acceptIdentity({
      identityKey: identity1.identityKey,
      deviceKey,
      haloSpaceKey: identity1.haloSpaceKey,
      haloGenesisFeedKey: identity1.haloGenesisFeedKey,
      controlFeedKey,
      dataFeedKey,
    });

    // TODO(dmaretskyi): We'd also need to admit device2's feeds otherwise messages from them won't be processed by the pipeline.
    // This would mean that peer2 has replicated it's device credential chain from peer1 and is ready to issue credentials.
    await identity2.ready();

    // Connection is authenticated.
    expect(identity1.space.protocol.sessions.get(identity2.deviceKey)).to.exist;
    expect(identity1.space.protocol.sessions.get(identity2.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
    expect(identity2.space.protocol.sessions.get(identity1.deviceKey)).to.exist;
    expect(identity2.space.protocol.sessions.get(identity1.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
    // TODO(nf): how to check whether peer1 has written the device profile credential?
  });

  test('sets device profile', async () => {
    const signalContext = new MemorySignalManagerContext();

    const peer = await setupPeer({ signalContext });
    const identity = await peer.identityManager.createIdentity();

    // Note: Waiting for device profile credential to be processed.
    await identity.stateUpdate.waitForCount(1);

    expect(!!identity.authorizedDeviceKeys.get(identity.deviceKey)?.platform).is.true;
  });

  test('updates device profile', async () => {
    const signalContext = new MemorySignalManagerContext();

    const peer = await setupPeer({ signalContext });

    const identity = await peer.identityManager.createIdentity();

    // Note: Waiting for device profile credential to be processed.
    await identity.stateUpdate.waitForCount(1);

    const deviceProfile = identity.authorizedDeviceKeys.get(identity.deviceKey);
    expect(deviceProfile).to.exist;

    deviceProfile!.label = 'updated profile';
    await peer.identityManager.updateDeviceProfile(deviceProfile!);

    expect(identity.authorizedDeviceKeys.get(identity.deviceKey)?.label).to.equal('updated profile');
  });
});
