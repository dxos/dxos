//
// Copyright 2020 DXOS.org
//

import { randomBytes, PublicKey } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { it as test } from 'mocha';
import expect from 'expect'

import { FeedStoreAdapter } from './feed-store-adapter';
import { createRamStorage } from './persistant-ram-storage';

test('close and re-open', async () => {
  const feedStore = new FeedStoreAdapter(new FeedStore(createRamStorage()));
  await feedStore.open();

  const partyKey = PublicKey.from(randomBytes());
  await feedStore.createWritableFeed(partyKey);
  await feedStore.close();
  await feedStore.open();

  expect(feedStore.getPartyKeys()).toHaveLength(1);
});
