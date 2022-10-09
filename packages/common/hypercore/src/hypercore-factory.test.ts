//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect } from 'chai';
import faker from 'faker';
import waitForExpect from 'wait-for-expect';

import { createKeyPair } from '@dxos/crypto';

import { HypercoreFactory } from './hypercore-factory';
import { HypercoreFeed } from './hypercore-feed';
import { createDataItem, TestDataItem } from './testing';

describe('Factory', function () {
  it('construct, open and close', async function () {
    const factory = new HypercoreFactory();
    const { publicKey } = createKeyPair();
    const feed = factory.create(publicKey);

    await feed.open();
    expect(feed.opened).to.be.true;

    await feed.close();
    expect(feed.closed).to.be.true;
  });

  it('append to and read from multiple feeds.', async function () {
    const factory = new HypercoreFactory();
    const numFeeds = 10;
    const numBlocks = 100;

    const feeds: HypercoreFeed[] = await Promise.all(Array.from({ length: numFeeds }).map(async () => {
      const feed = factory.create();
      await feed.open();
      return feed;
    }));

    // Write data.
    {
      const data = Array.from({ length: numBlocks }).map((_, i) => createDataItem(i));
      for await (const datum of data) {
        const feed = faker.random.arrayElement(feeds);
        await feed.append(Buffer.from(JSON.stringify(datum)));
      }
    }

    // Test.
    {
      const total = feeds.reduce((result, feed) => result + feed.length, 0);
      expect(total).to.eq(numBlocks);

      const feed = faker.random.arrayElement(feeds);
      const block1 = await feed.head();
      const block2 = await feed.get(feed.length - 1);
      expect(block1.toString()).to.eq(block2.toString());

      const blocks = await feed.getBatch(0, feed.length);
      expect(blocks.length).to.eq(feed.length);
    }

    await Promise.all(feeds.map(feed => feed.close()));
  });

  it('replicate messages', async function () {
    // TODO(burdon): Files must be unique since 6 cores per feed -- need one factory per feed! { key, secret_key, tree, data, bitfield, signatures).
    const factory = new HypercoreFactory();
    const numBlocks = 100;

    // Replicating feeds must have the same public key.
    const { publicKey, secretKey } = createKeyPair();

    const feed1 = factory.create(publicKey, { secretKey });
    await feed1.open();

    const feed2 = factory.create(publicKey);
    await feed2.open();

    const stream1 = feed1.replicate(true);
    const stream2 = feed2.replicate(false);
    stream1.pipe(stream2).pipe(stream1);

    let uploaded = 0;
    feed1.on('upload', () => {
      uploaded++;
      // TODO(burdon): Formatter.
      console.log('up  ', String(uploaded).padStart(4), feed1.length);
    });

    let downloaded = 0;
    feed2.on('download', (seq: number, data: Buffer) => {
      const { id } = JSON.parse(data.toString()) as TestDataItem;
      expect(id).to.eq(seq);
      downloaded++;
      console.log('down', String(downloaded).padStart(4), feed2.length);
      expect(downloaded).to.be.lessThanOrEqual(uploaded);
    });

    // TODO(burdon): Everything is written synchronously, so this is only called once.
    feed2.on('sync', () => {
      console.log('sync');
      expect(feed2.length).to.eq(numBlocks);
    });

    // TODO(burdon): This doesn't work.
    // setRandomInterval((i) => {
    //   const datum = createDataItem(i);
    //   void feed1.append(JSON.stringify(datum));
    //   return i < numBlocks - 1;
    // }, 0, 10);

    const data: TestDataItem[] = Array.from({ length: numBlocks }).map((_, i) => createDataItem(i));
    for (const datum of data) {
      void feed1.append(JSON.stringify(datum));

      // TODO(burdon): Flush sporadically to test random syncing.
      if (faker.datatype.boolean()) {
        void feed1.flush();
      }
    }

    await feed1.flush();

    await waitForExpect(async () => {
      expect(downloaded).to.eq(numBlocks);
      expect(feed2.length).to.eq(feed1.length);
    });

    await feed2.close();
    await feed1.close();
  });
});
