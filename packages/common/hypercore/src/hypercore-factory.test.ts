//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect } from 'chai';
import faker from 'faker';

import { HypercoreFactory } from './hypercore-factory';

describe('Factory', function () {
  it('construct, open and close', async function () {
    const factory = new HypercoreFactory();
    const feed = factory.create();

    await feed.open();
    expect(feed.opened).to.be.true;

    await feed.close();
    expect(feed.closed).to.be.true;
  });

  it('construct, append to, and close multiple feeds.', async function () {
    const factory = new HypercoreFactory();
    const numFeeds = 10;
    const numBlocks = 100;

    const feeds = Array.from({ length: numFeeds }).map(() => factory.create());

    await Promise.all(feeds.map(feed => feed.open()));

    const data = Array.from({ length: numBlocks }).map(() => faker.lorem.sentence());
    for await (const datum of data) {
      const feed = faker.random.arrayElement(feeds);
      await feed.append(Buffer.from(datum));
    }

    await Promise.all(feeds.map(feed => feed.close()));
  });
});
