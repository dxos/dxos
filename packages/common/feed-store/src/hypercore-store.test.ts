//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { TestItemBuilder } from './testing/index.ts';

describe('HypercoreStore', () => {
  test('creates feeds', async () => {
    const builder = new TestItemBuilder();
    const hypercoreStore = builder.createHypercoreStore();

    const numFeeds = 5;
    const feedKeys = await Promise.all(
      Array.from(Array(numFeeds)).map(async () => {
        const feedKey = PublicKey.random();
        await hypercoreStore.openHypercore(feedKey);
        return feedKey;
      }),
    );

    {
      for (const feedKey of feedKeys) {
        const feed = hypercoreStore.getHypercore(feedKey)!;
        expect(feed.key).to.eq(feedKey);
        expect(feed.properties.opened).to.be.true;
        expect(feed.properties.readable).to.be.true;
        expect(feed.properties.writable).to.be.false;
      }

      expect(hypercoreStore.size).to.eq(feedKeys.length);
    }

    {
      await hypercoreStore.close();
      expect(hypercoreStore.size).to.eq(0);
    }
  });

  test('gets an opened feed', async () => {
    const builder = new TestItemBuilder();
    const hypercoreStore = builder.createHypercoreStore();
    const feedKey = PublicKey.random();

    {
      const feed = await hypercoreStore.openHypercore(feedKey);
      expect(feed.key).to.eq(feedKey);
      expect(feed.properties.writable).to.be.false;
      expect(hypercoreStore.size).to.eq(1);
    }

    {
      const feed = await hypercoreStore.openHypercore(feedKey);
      expect(feed.key).to.eq(feedKey);
      expect(feed.properties.writable).to.be.false;
      expect(hypercoreStore.size).to.eq(1);
    }
  });

  test('tries to open an existing readable feed as writable', async () => {
    const builder = new TestItemBuilder();
    const hypercoreStore = builder.createHypercoreStore();
    const feedKey = PublicKey.random();

    {
      const feed = await hypercoreStore.openHypercore(feedKey);
      expect(feed.key).to.eq(feedKey);
      expect(feed.properties.writable).to.be.false;
      expect(hypercoreStore.size).to.eq(1);
    }

    // Attempt to reopen as writable (fail).
    {
      await expect(hypercoreStore.openHypercore(feedKey, { writable: true })).rejects.toBeInstanceOf(Error);
    }
  });
});
