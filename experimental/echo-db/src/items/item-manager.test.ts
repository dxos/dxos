//
// Copyright 2020 DXOS.org
//

import ram from 'random-access-memory';

import { createKeyPair } from '@dxos/crypto';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { createWritableFeedStream } from '@dxos/experimental-util';
import { FeedStore } from '@dxos/feed-store';

import { ItemManager } from './item-manager';

describe('items', () => {
  test('item construction', async () => {
    const feedStore = new FeedStore(ram);
    await feedStore.open();
    const feed = await feedStore.openFeed('test-feed');

    const { publicKey: partyKey } = createKeyPair();

    const modelFactory = new ModelFactory();
    const itemManager = new ItemManager(partyKey, modelFactory, createWritableFeedStream(feed));
    expect(itemManager).toBeTruthy();
  });
});
