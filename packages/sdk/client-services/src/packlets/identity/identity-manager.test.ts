//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { valueEncoding, MetadataStore } from '@dxos/echo-db';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { IdentityManager } from './identity-manager';

describe('identity/identity-manager', function () {
  const setupPeer = async ({
    signalContext = new MemorySignalManagerContext(),
    storage = createStorage({ type: StorageType.RAM })
  }: {
    signalContext?: MemorySignalManagerContext;
    storage?: Storage;
  } = {}) => {
    const metadataStore = new MetadataStore(storage.createDirectory('metadata'));

    const keyring = new Keyring(storage.createDirectory('keyring'));
    const feedStore = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory('feeds'),
        signer: keyring,
        hypercore: {
          valueEncoding
        }
      })
    });

    afterTest(() => feedStore.close());

    const networkManager = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory
    });

    const identityManager = new IdentityManager(
      metadataStore,
      feedStore,
      keyring,
      networkManager,
      new ModelFactory().registerModel(ObjectModel)
    );

    return {
      identityManager,
      feedStore
    };
  };

  it('creates identity', async function () {
    const { identityManager } = await setupPeer();
    await identityManager.open();
    afterTest(() => identityManager.close());

    const identity = await identityManager.createIdentity();
    expect(identity).toBeTruthy();
  });

  it('reload from storage', async function () {
    const storage = createStorage({ type: StorageType.RAM });

    const peer1 = await setupPeer({ storage });
    await peer1.identityManager.open();
    const identity1 = await peer1.identityManager.createIdentity();
    await peer1.identityManager.close();
    await peer1.feedStore.close();

    const peer2 = await setupPeer({ storage });
    await peer2.identityManager.open();

    expect(peer2.identityManager.identity).toBeDefined();
    expect(peer2.identityManager.identity!.identityKey).toEqual(identity1.identityKey);
    expect(peer2.identityManager.identity!.deviceKey).toEqual(identity1.deviceKey);

    // TODO(dmaretskyi): Check that identity is "alive" (space is working and can write mutations).
  });

  it('admit another device', async function () {
    const signalContext = new MemorySignalManagerContext();

    const peer1 = await setupPeer({ signalContext });
    const identity1 = await peer1.identityManager.createIdentity();

    const peer2 = await setupPeer({ signalContext });

    // Identity2 is not yet ready at this point. Peer1 needs to admit peer2 device key and feed keys.
    const identity2 = await peer2.identityManager.acceptIdentity({
      identityKey: identity1.identityKey,
      haloSpaceKey: identity1.haloSpaceKey,
      haloGenesisFeedKey: identity1.haloGenesisFeedKey
    });

    await identity1.controlPipeline.writer.write({
      '@type': 'dxos.echo.feed.CredentialsMessage',
      credential: await identity1.getIdentityCredentialSigner().createCredential({
        subject: identity2.deviceKey,
        assertion: {
          '@type': 'dxos.halo.credentials.AuthorizedDevice',
          identityKey: identity2.identityKey,
          deviceKey: identity2.deviceKey
        }
      })
    });

    // TODO(dmaretskyi): We'd also need to admit device2's feeds otherwise messages from them won't be processed by the pipeline.
    // This would mean that peer2 has replicated it's device credential chain from peer1 and is ready to issue credentials.
    await identity2.ready();
  });
});
