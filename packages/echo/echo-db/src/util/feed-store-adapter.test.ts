//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { randomBytes, PublicKey } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { FeedStoreAdapter } from './feed-store-adapter';
import { createRamStorage } from './persistant-ram-storage';
import { Keyring } from '@dxos/credentials';

test('close and re-open', async () => {
  const keyring = new Keyring();
  const feedStore = new FeedStoreAdapter(new FeedStore(createRamStorage()), keyring);
  await feedStore.open();

  const partyKey = PublicKey.from(randomBytes());
  await feedStore.createWritableFeed(partyKey);
  await feedStore.close();
  await feedStore.open();

  expect(feedStore.getPartyKeys()).toHaveLength(1);
});
