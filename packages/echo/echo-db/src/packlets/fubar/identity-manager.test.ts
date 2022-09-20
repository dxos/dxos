//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { MetadataStore } from '../metadata';
import { IdentityManager } from './identity-manager';
import { StateManager } from '@dxos/model-factory';
import { PubKey } from 'packages/common/protocols/proto/dxos/halo/keys';

describe('fubar/identity-manager', () => {
  const setup = async ({
    signalContext = new MemorySignalManagerContext(),
    storage = createStorage({ type: StorageType.RAM })
  }: {
    signalContext?: MemorySignalManagerContext
    storage?: Storage
  } = {}) => {
    const metadata = new MetadataStore(storage.createDirectory('metadata'));
    const keyring = new Keyring(storage.createDirectory('keyring'));
    const feedStore = new FeedStore(storage.createDirectory('feeds'), { valueEncoding: codec });
    afterTest(() => feedStore.close());

    const networkManager = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext)
    });

    const identityManager = new IdentityManager(
      metadata,
      keyring,
      feedStore,
      networkManager
    );

    return {
      identityManager,
      feedStore
    };
  };

  test('creates identity', async () => {
    const { identityManager } = await setup();
    await identityManager.open();
    afterTest(() => identityManager.close());

    const identity = await identityManager.createIdentity();
    expect(identity).toBeTruthy();
  });

  test('reload from storage', async () => {
    const storage = createStorage({ type: StorageType.RAM });

    const peer1 = await setup({ storage });
    await peer1.identityManager.open();
    const identity1 = await peer1.identityManager.createIdentity();
    await peer1.identityManager.close();
    await peer1.feedStore.close();

    const peer2 = await setup({ storage });
    await peer2.identityManager.open();
    expect(peer2.identityManager.identity).toBeDefined();
    expect(peer2.identityManager.identity!.identityKey).toEqual(identity1.identityKey);
    expect(peer2.identityManager.identity!.deviceKey).toEqual(identity1.deviceKey);

    // TODO(dmaretskyi): Check that identity is "alive" (space is working and can write mutations).
  });

  test('admit another device', async () => {
    const signalContext = new MemorySignalManagerContext()

    const peer1 = await setup({ signalContext })
    const identity1 = await peer1.identityManager.createIdentity()

    const peer2 = await setup({ signalContext })

    // Identity2 is not yet ready at this point. Peer1 needs to admit peer2 device key and feed keys.
    const identity2 = await peer2.identityManager.acceptIdentity({
      identityKey: identity1.identityKey,
      haloSpaceKey: identity1.haloSpaceKey,
      haloGenesisFeedKey: identity1.haloGenesisFeedKey
    })

    await identity1.controlPipeline.writer.write({
      '@type': 'dxos.echo.feed.CredentialsMessage',
      credential: await identity1.getIdentityCredentialSigner().createCredential({
        subject: identity2.deviceKey,
        assertion: {
          "@type": 'dxos.halo.credentials.AuthorizedDevice',
          identityKey: identity2.identityKey,
          deviceKey: identity2.deviceKey,
        }
      })
    });
    // TODO(dmaretskyi): We'd also need to admit device2's feeds otherwise messages from them won't be processed by the pipeline.

    // This would mean that peer2 has replicated it's device credential chain from peer1 and is ready to issue credentials.
    await identity2.ready()
  })
});

