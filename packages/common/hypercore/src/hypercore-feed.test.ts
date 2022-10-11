//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect } from 'chai';
import faker from 'faker';
import hypercore from 'hypercore';
import ram from 'random-access-memory';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';

import { HypercoreFactory } from './hypercore-factory';
import { HypercoreFeed, wrapFeed } from './hypercore-feed';
import { batch, createDataItem, TestDataItem } from './testing';
import { ProtocolStream } from './types';

describe('Factory', function () {
  it('construct, open and close', async function () {
    // const key = sha256(PublicKey.random().toHex());
    const core = hypercore(ram);
    const feed = wrapFeed(core);

    expect(feed.opened).to.be.false;
    expect(feed.closed).to.be.false;

    await feed.open();
    expect(feed.opened).to.be.true;
    expect(feed.closed).to.be.false;

    // Can be called multiple times.
    await feed.open();
    expect(feed.opened).to.be.true;
    expect(feed.closed).to.be.false;

    await feed.close();
    expect(feed.opened).to.be.true; // Expected.
    expect(feed.closed).to.be.true;

    // Can be called multiple times.
    await feed.close();

    // Cannot be reopened.
    await expect(feed.open()).to.be.rejectedWith(Error);
  });

  it('append to and read from multiple feeds.', async function () {
    const factory = new HypercoreFactory(ram);
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
    const factory = new HypercoreFactory(ram);
    const numBlocks = 10;

    const log = (label: string, count: number, total: number) =>
      console.log(`${label.padEnd(6)} ${String(count).padStart(4)}/${String(total)}`);

    // Replicating feeds must have the same public key.
    const { publicKey, secretKey } = createKeyPair();

    const feed1 = factory.create(publicKey, { secretKey });
    await feed1.open();

    const feed2 = factory.create(publicKey);
    await feed2.open();

    const stream1: ProtocolStream = feed1.replicate(true, { live: true });
    const stream2: ProtocolStream = feed2.replicate(false, { live: true });

    // Closed
    // TODO(burdon): Return function with timeout.
    const [closed, close] = latch({ count: 2 });

    // Start replication.
    stream1.pipe(stream2, close).pipe(stream1, close);

    expect(feed1.stats.peers).to.have.lengthOf(1);
    expect(feed2.stats.peers).to.have.lengthOf(1);

    // Wait until all uploaded.
    const [waitForUpload, incUpload] = latch({ count: numBlocks });

    // Monitor uploads
    let uploaded = 0;
    feed1.on('upload', () => {
      uploaded++;
      log('up', uploaded, feed1.length);
      incUpload();
    });

    // Monitor downloads.
    let downloaded = 0;
    feed2.on('download', (seq: number, data: Buffer) => {
      downloaded++;
      const { id } = JSON.parse(data.toString()) as TestDataItem;
      expect(id).to.eq(seq);
      log('down', downloaded, feed2.length);
      expect(downloaded).to.be.lessThanOrEqual(uploaded);
    });

    // Monitor sync points (multiple since delayed writes).
    feed2.on('sync', () => {
      log('sync', uploaded, downloaded);
      void feed2.download();
    });

    // Write batch of messages with delay.
    batch((next, i, remaining) => {
      const size = faker.datatype.number({ min: 1, max: Math.min(10, remaining) });
      for (let j = 0; j < size; j++) {
        void feed1.append(JSON.stringify(createDataItem(i + j)));
      }

      // Random delay.
      setTimeout(() => {
        next(size);
      }, faker.datatype.number({ min: 0, max: 100 }));
    }, numBlocks);

    // Done.
    await waitForUpload;
    expect(uploaded).to.eq(downloaded);

    // Close streams.
    {
      stream1.end();
      stream2.end();

      await closed;
      expect(stream1.destroyed).to.be.true;
      expect(stream2.destroyed).to.be.true;

      expect(feed1.stats.totals.uploadedBlocks).to.eq(numBlocks);
      expect(feed2.stats.totals.downloadedBlocks).to.eq(numBlocks);
      expect(feed1.stats.totals.downloadedBytes).to.eq(feed2.stats.totals.uploadedBytes);
    }

    // Close feeds.
    {
      await feed1.close();
      console.log(feed1.opening, feed1.opened, feed1.closing, feed1.closed);

      // TODO(burdon): Not closed, but hypercore throws: "Feed is closed" (one of the random-access-storage is closed).
      await feed2.close();
      console.log(feed2.opening, feed2.opened, feed2.closing, feed2.closed);
    }

  }).timeout(3000);
});
