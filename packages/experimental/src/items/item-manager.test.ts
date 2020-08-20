//
// Copyright 2020 DXOS.org
//

import ram from 'random-access-memory';

import { FeedStore } from '@dxos/feed-store';

import { ModelFactory } from '../models';
import { createWritableFeedStream } from '../feeds';
import { ItemManager } from './item-manager';

describe('items', () => {
  test('item construction', async () => {
    const feedStore = new FeedStore(ram);
    await feedStore.open();
    const feed = await feedStore.openFeed('test-feed');

    const modelFactory = new ModelFactory();
    const itemManager = new ItemManager(modelFactory, createWritableFeedStream(feed));
    expect(itemManager).toBeTruthy();
  });
});
