//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { PublicKey } from '@dxos/keys';

import { FeedWrapper } from './feed-wrapper';
import { TestBuilder } from './testing';

// TODO(burdon): Test proto encoding.

describe('FeedWrapper', function () {
  const factory = new TestBuilder().createFeedFactory();

  it('Creates a readable key', async function () {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key), key);
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.false;
    await feed.close();
  });

  it('Creates a writable key', async function () {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.true;
    await feed.close();
  });

  it('Creates, opens, and closes a feed multiple times.', async function () {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key), key);

    await feed.open();
    expect(feed.properties.opened).to.be.true;
    expect(feed.properties.closed).to.be.false;
    await feed.open();

    await feed.close();
    expect(feed.properties.opened).to.be.true;
    expect(feed.properties.closed).to.be.true;
    await feed.close();
  });

  it('Appends blocks', async function () {
    const builder = new TestBuilder();
    const feedKey = await builder.keyring!.createKey();
    const feedFactory = builder.createFeedFactory();
    const feed = await feedFactory.createFeed(feedKey, { writable: true });

    const numBlocks = 10;
    for (const _ of Array.from(Array(numBlocks))) {
      await feed.append(faker.lorem.sentence());
    }
  });
});
