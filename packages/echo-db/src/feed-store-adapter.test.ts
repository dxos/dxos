//
// Copyright 2020 DXOS.org
//

import { randomBytes } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { FeedStoreAdapter } from './feed-store-adapter';
import { createRamStorage } from './persistant-ram-storage';

test('close and re-open', async () => {
  const feedStore = new FeedStoreAdapter(new FeedStore(createRamStorage()));
  await feedStore.open();

  const partyKey = randomBytes();
  await feedStore.createWritableFeed(partyKey);
  await feedStore.close();
  await feedStore.open();

  expect(feedStore.getPartyKeys()).toHaveLength(1);
});
