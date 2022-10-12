//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
// import debug from 'debug';
import faker from 'faker';
import hypercore from 'hypercore';
import ram from 'random-access-memory';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';

import { wrapFeed } from './hypercore-feed';
import { batch, createDataItem, TestDataItem } from './testing';

chai.use(chaiAsPromised);

// const log = debug('dxos:hypercore:test');

// TODO(burdon): Factor out table logger.
const logRow = (label: string, values: number[]) => {
  // console.log(`${label.padEnd(6)} ${values.map(value => String(value).padStart(3)).join(' ')}`);
};

describe('Feed', function () {
  it('constructs, opens and closes', async function () {
    // const key = sha256(PublicKey.random().toHex());
    const core = hypercore(ram);
    const feed = wrapFeed(core);

    expect(feed.opened).to.be.false;
    expect(feed.closed).to.be.false;

    // Open.
    await feed.open();
    expect(feed.opened).to.be.true;
    expect(feed.closed).to.be.false;

    // Can be called multiple times.
    await feed.open();
    expect(feed.opened).to.be.true;
    expect(feed.closed).to.be.false;

    // Close.
    await feed.close();
    expect(feed.opened).to.be.true; // Expected.
    expect(feed.closed).to.be.true;

    // Can be called multiple times.
    await feed.close();

    // Cannot be reopened.
    await expect(feed.open()).to.be.rejectedWith(Error);
  });

  it('replicates', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const feed1 = wrapFeed(hypercore(ram, publicKey, { secretKey }));
    const feed2 = wrapFeed(hypercore(ram, publicKey));

    // Wait for ready.
    {
      await feed1.open();
      await feed2.open();
    }

    const numBlocks = 10;

    // Sync.
    {
      const stream1 = feed1.replicate(true);
      const stream2 = feed2.replicate(false);

      const [streamsClosed, onClose] = latch({ count: 2 });
      stream1.pipe(stream2, onClose).pipe(stream1, onClose);

      expect(feed1.stats.peers).to.have.lengthOf(1);
      expect(feed2.stats.peers).to.have.lengthOf(1);

      // Wait for complete sync.
      feed2.on('sync', () => {
        stream1.end();
        stream2.end();
      });

      // Write.
      for (let i = 0; i < numBlocks; i++) {
        void feed1.append(`test-${i}`);
      }

      await streamsClosed();
    }

    // Close.
    {
      await feed1.close();
      await feed1.close();
    }

    expect(feed1.stats.totals.uploadedBlocks).to.eq(numBlocks);
    expect(feed2.stats.totals.downloadedBlocks).to.eq(numBlocks);
  });

  it('replicates in batches', async function () {
    const numBlocks = 100;

    // Replicating feeds must have the same public key.
    const { publicKey, secretKey } = createKeyPair();
    const feed1 = wrapFeed(hypercore(ram, publicKey, { secretKey }));
    const feed2 = wrapFeed(hypercore(ram, publicKey));

    await feed1.open();
    await feed2.open();

    const stream1 = feed1.replicate(true);
    const stream2 = feed2.replicate(false);

    // Start replication.
    const [streamsClosed, onClose] = latch({ count: 2 });
    stream1.pipe(stream2, onClose).pipe(stream1, onClose);

    expect(feed1.stats.peers).to.have.lengthOf(1);
    expect(feed2.stats.peers).to.have.lengthOf(1);

    // Replicate messages.
    {
      // Wait until all uploaded.
      const [waitForDownloaded, incDownload] = latch({ count: numBlocks });

      // Monitor uploads.
      let uploaded = 0;
      feed1.on('upload', () => {
        uploaded++;
        logRow(' up', [uploaded, feed1.length]);
      });

      // Monitor downloads.
      let downloaded = 0;
      feed2.on('download', (seq: number, data: Buffer) => {
        downloaded++;
        const { id } = JSON.parse(data.toString()) as TestDataItem;
        expect(id).to.eq(seq);
        logRow(' down', [downloaded, feed2.length]);
        expect(downloaded).to.be.lessThanOrEqual(uploaded);
        incDownload();
      });

      // Monitor sync points (multiple since delayed writes).
      const sync = { started: 0, complete: 0 };
      feed2.on('sync', () => {
        logRow('=sync=', [++sync.started]);

        // TODO(burdon): Possible race condition bug when closing feeds if callback isn't provided.
        //  Uncaught Error: Feed is closed
        void feed2.download(() => {
          logRow('=done=', [++sync.complete]);
        });
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
      await waitForDownloaded();
      expect(uploaded).to.eq(downloaded);
    }

    // Close streams.
    {
      stream1.end();
      stream2.end();

      await streamsClosed();
      expect(stream1.destroyed).to.be.true;
      expect(stream2.destroyed).to.be.true;
    }

    // Close feeds.
    {
      await feed1.close();
      await feed2.close();

      expect(feed1.writable).to.be.false;
      expect(feed1.stats.totals.uploadedBlocks).to.eq(numBlocks);
      expect(feed2.stats.totals.downloadedBlocks).to.eq(numBlocks);
    }
  }).timeout(5000);
});
