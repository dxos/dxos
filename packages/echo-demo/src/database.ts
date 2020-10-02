//
// Copyright 2020 DXOS.org
//

import ram from 'random-access-memory';

import { Keyring, KeyType, KeyStore } from '@dxos/credentials';
import { codec, ECHO, PartyManager, PartyFactory, FeedStoreAdapter, IdentityManager } from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, SwarmProvider } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

export const createECHO = async ({
  storage = ram, keyStorage = undefined, swarmProvider = new SwarmProvider()
} = {}) => {
  const feedStore = new FeedStore(storage, { feedOptions: { valueEncoding: codec } });
  const feedStoreAdapter = new FeedStoreAdapter(feedStore);

  const keystore = new KeyStore(keyStorage);
  const keyring = new Keyring(keystore);
  await keyring.load();
  const identityManager = new IdentityManager(keyring);

  const modelFactory = new ModelFactory()
    .registerModel(ObjectModel);

  const networkManager = new NetworkManager(feedStore, swarmProvider);
  const partyFactory = new PartyFactory(identityManager, feedStoreAdapter, modelFactory, networkManager);
  const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

  await partyManager.open();

  if (!identityManager.identityKey) {
    await identityManager.keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await partyManager.createHalo();
  }

  const echo = new ECHO(partyManager);

  return { echo, keyring };
};
