//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Keyring } from '@dxos/credentials';
import { randomBytes, PublicKey } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { FeedStoreAdapter } from './feed-store-adapter';
import { createRamStorage } from './persistant-ram-storage';
import { MetadataStore } from '../metadata';

test('close and re-open', async () => {
  const keyring = new Keyring();
  const storage = createRamStorage();
  const metadataStore = new MetadataStore(createRamStorage());
  const feedStore = new FeedStoreAdapter(new FeedStore(storage), keyring, metadataStore);
  await feedStore.open();

  const partyKey = PublicKey.from(randomBytes());
  await feedStore.createWritableFeed(partyKey);
  await feedStore.close();
  await feedStore.open();

  expect(feedStore.getPartyKeys()).toHaveLength(1);
});
