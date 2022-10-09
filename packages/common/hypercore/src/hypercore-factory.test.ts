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

type TestData = { id: string, text: string }

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

  it('construct, append to, and close multiple feeds.', async function () {
    const factory = new HypercoreFactory();

    const numFeeds = 10;
    const feeds: HypercoreFeed[] = await Promise.all(Array.from({ length: numFeeds }).map(async () => {
      const feed = factory.create();
      await feed.open();
      return feed;
    }));

    const numBlocks = 100;
    const data = Array.from({ length: numBlocks }).map(() => faker.lorem.sentence());
    for await (const datum of data) {
      const feed = faker.random.arrayElement(feeds);
      await feed.append(Buffer.from(datum));
    }

    await Promise.all(feeds.map(feed => feed.close()));

    const total = feeds.reduce((result, feed) => result + feed.length, 0);
    expect(total).to.eq(numBlocks);
  });

  it('replicate messages', async function () {
    // TODO(burdon): Files must be unique since 6 cores per feed -- need one factory per feed! { key, secret_key, tree, data, bitfield, signatures).
    const factory = new HypercoreFactory();

    // Replicating feeds must have the same public key.
    const { publicKey, secretKey } = createKeyPair();

    const feed1 = factory.create(publicKey, { secretKey });
    await feed1.open();

    const feed2 = factory.create(publicKey);
    await feed2.open();

    const stream1 = feed1.replicate(true);
    const stream2 = feed2.replicate(false);
    stream1.pipe(stream2).pipe(stream1);

    let count = 0;
    (feed2 as any).on('download', (seq: number, data: Buffer) => {
      const { id } = JSON.parse(data.toString()) as TestData;
      expect(id).to.eq(String(seq));
      count++;
    });

    const numBlocks = 3;
    const data: TestData[] = Array.from({ length: numBlocks }).map((_, i) => ({ id: String(i), text: faker.lorem.sentence() }));
    for await (const datum of data) {
      void feed1.append(JSON.stringify(datum));
    }

    await feed1.flush();

    await waitForExpect(async () => {
      expect(count).to.eq(numBlocks);
      expect(feed2.length).to.eq(feed1.length);
    });

    await feed2.close();
    await feed1.close();
  });
});
