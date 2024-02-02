//
// Copyright 2019 DXOS.org
//

import { expect } from 'chai';

import { createKeyPair } from '@dxos/crypto';
import { faker } from '@dxos/random';
import { describe, test } from '@dxos/test';

import { HypercoreFactory } from './hypercore-factory';
import { createDataItem } from './testing';
import { py } from './util';

describe('HypercoreFactory', () => {
  test('appends to, and read from, multiple feeds', async () => {
    const factory = new HypercoreFactory();

    const numFeeds = 10;
    const numBlocks = 100;

    // Create feeds.
    const feeds = await Promise.all(
      Array.from({ length: numFeeds }).map(async () => {
        const { publicKey, secretKey } = createKeyPair();
        return await factory.openFeed(publicKey, { secretKey });
      }),
    );

    // Write data.
    {
      const data = Array.from({ length: numBlocks }).map((_, i) => createDataItem(i));
      for await (const datum of data) {
        const feed = faker.helpers.arrayElement(feeds);
        await py(feed, feed.append)(Buffer.from(JSON.stringify(datum)));
      }
    }

    // Test.
    {
      const total = feeds.reduce((result, feed) => result + feed.length, 0);
      expect(total).to.eq(numBlocks);

      const feed = faker.helpers.arrayElement(feeds);
      const block1 = await py(feed, feed.head)();
      const block2 = await py(feed, feed.get)(feed.length - 1);
      expect(block1.toString()).to.eq(block2.toString());

      const blocks = await py(feed, feed.getBatch)(0, feed.length);
      expect(blocks.length).to.eq(feed.length);
    }

    await Promise.all(feeds.map((feed) => feed.close()));
  });
});
