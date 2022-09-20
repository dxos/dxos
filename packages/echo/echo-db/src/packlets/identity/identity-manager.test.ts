//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { MetadataStore } from '../metadata';
import { codec } from '../testing';
import { IdentityManager } from './identity-manager';

describe('identity/identity-manager', () => {
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
});
