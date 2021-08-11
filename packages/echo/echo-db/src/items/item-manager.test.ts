//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createKeyPair, PublicKey } from '@dxos/crypto';
import { createFeedWriter } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';

import { ItemManager } from './item-manager';

describe('items', () => {
  test('item construction', async () => {
    const feedStore = new FeedStore(createStorage('', STORAGE_RAM));
    await feedStore.open();
    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });

    const modelFactory = new ModelFactory();
    const itemManager = new ItemManager(modelFactory, createFeedWriter(feed));
    expect(itemManager).toBeTruthy();
  });
});
