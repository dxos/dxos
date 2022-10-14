//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch } from '@dxos/async';

import { TestBuilder } from './testing';

describe('FeedFactory', function () {
  it.skip('Replicates', async function () {
    const builder = new TestBuilder();
    const feedFactory = builder.createFeedFactory();

    const feedKey1 = await builder.keyring!.createKey();
    const feedKey2 = await builder.keyring!.createKey();

    const feed1 = await feedFactory.createFeed(feedKey1, { writable: true });
    const feed2 = await feedFactory.createFeed(feedKey2);

    const stream1 = feed1.replicate(true);
    const stream2 = feed2.replicate(false);

    const [done, onClose] = latch({ count: 2 });
    stream1.pipe(stream2, onClose).pipe(stream1, onClose);

    expect(feed1.stats.peers).to.have.lengthOf(1);
    expect(feed2.stats.peers).to.have.lengthOf(1);

    const numBlocks = 10;

    // Writer.
    {
      setTimeout(async () => {
        for (const _ of Array.from(Array(numBlocks))) {
          await feed1.append(faker.lorem.sentence());
        }
      });
    }

    // Reader.
    {

    }

    await done();
  });
});
