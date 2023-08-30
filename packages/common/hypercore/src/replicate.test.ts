//
// Copyright 2019 DXOS.org
//

import { faker } from '@faker-js/faker';
import { expect } from 'chai';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { HypercoreFactory } from './hypercore-factory';
import { createReadable } from './iterator';
import { batch, createDataItem, TestDataItem } from './testing';

const noop = () => {};

describe('Replication', () => {
  const factory1 = new HypercoreFactory();
  const factory2 = new HypercoreFactory();

  test('replicates feeds', async () => {
    const { publicKey, secretKey } = createKeyPair();
    const core1 = factory1.createFeed(publicKey, { stats: true, sparse: true, eagerUpdate: false, secretKey });
    const core2 = factory2.createFeed(publicKey, { stats: true, sparse: true, eagerUpdate: false });

    // Open.
    {
      const [ready, done] = latch({ count: 2 });
      core1.open(done);
      core2.open(done);
      await ready();
    }

    const numBlocks = 100;

    // TODO(burdon): Test # wire requests
    //  Defined by replication or feed options (defaults to 16).
    const maxRequests = undefined;

    // Sync.
    {
      // TODO(burdon): Replicate options.
      //  https://github.com/holepunchto/hypercore/tree/v9.12.0#var-stream--feedreplicateisinitiator-options
      const stream1 = core1.replicate(true, { maxRequests });
      const stream2 = core2.replicate(false, { maxRequests });

      {
        const uploaded: number[] = [];
        const downloaded: number[] = [];
        core1.on('upload', (i) => {
          uploaded.push(i);
        });
        core2.on('download', (i) => {
          downloaded.push(i);
        });

        // Fired when all data is replicated.
        core2.on('sync', () => {
          const blocks = downloaded.reduce((set, i) => set.add(i), new Set<number>());
          expect(uploaded.length).to.eq(downloaded.length);
          expect(blocks.size).to.eq(numBlocks);

          // TODO(burdon): Not linear or matching.
          // console.log('##', JSON.stringify({ uploaded, stats: core1.stats }));
          // console.log('##', JSON.stringify({ downloaded, stats: core2.stats }));
        });
      }

      // TODO(burdon): Buffer requests: 1) network stream; 2) file IO.
      const [streamsClosed, onClose] = latch({ count: 2 });
      stream1.pipe(stream2, onClose).pipe(stream1, onClose);

      expect(core1.stats.peers).to.have.lengthOf(1);
      expect(core2.stats.peers).to.have.lengthOf(1);

      // Wait for complete sync.
      core2.on('sync', () => {
        stream1.end();
        stream2.end();
      });

      // Write.
      for (let i = 0; i < numBlocks; i++) {
        core1.append(`test-${i}`, noop);
      }

      // Explicitly download (since sparse and not eager).
      // Not completely linear but much more ordered than eager replication.
      core2.download({ start: 0, linear: true });
      await streamsClosed();
    }

    // Close.
    {
      const [closed, close] = latch({ count: 2 });
      core1.close(close);
      core1.close(close);
      await closed();
    }

    expect(core1.stats.totals.uploadedBlocks).to.eq(numBlocks);
    expect(core2.stats.totals.downloadedBlocks).to.eq(numBlocks);
  });

  test('replicates feeds in batches', async () => {
    const numBlocks = 100;

    // Replicating feeds must have the same public key.
    const { publicKey, secretKey } = createKeyPair();
    const core1 = factory1.createFeed(publicKey, { secretKey });
    const core2 = factory2.createFeed(publicKey);

    // Open.
    {
      const [ready, done] = latch({ count: 2 });
      core1.open(done);
      core2.open(done);
      await ready();
    }

    const stream1 = core1.replicate(true);
    const stream2 = core2.replicate(false);

    // Start replication.
    // NOTE: Replication won't start unless the public keys on both sides are the same.
    const [streamsClosed, onClose] = latch({ count: 2 });
    stream1.pipe(stream2, onClose).pipe(stream1, onClose);

    expect(core1.stats.peers).to.have.lengthOf(1);
    expect(core2.stats.peers).to.have.lengthOf(1);

    // Replicate messages.
    {
      // Wait until all uploaded.
      const [waitForDownloaded, incDownload] = latch({ count: numBlocks });

      // Monitor uploads.
      let uploaded = 0;
      core1.on('upload', () => {
        uploaded++;
        log('up', { uploaded, length: core1.length });
      });

      // Monitor downloads.
      let downloaded = 0;
      core2.on('download', (seq: number, data: Buffer) => {
        downloaded++;
        const { id } = JSON.parse(data.toString()) as TestDataItem;
        expect(id).to.eq(seq);
        log('down', { downloaded, length: core2.length });
        expect(downloaded).to.be.lessThanOrEqual(uploaded);
        incDownload();
      });

      // Monitor sync points (multiple since delayed writes).
      const sync = { started: 0, complete: 0 };
      core2.on('sync', () => {
        log('sync', { events: ++sync.started });
        core2.download();
      });

      // Write batch of messages with delay.
      batch((next, i, remaining) => {
        const size = faker.number.int({
          min: 1,
          max: Math.min(10, remaining),
        });
        for (let j = 0; j < size; j++) {
          core1.append(JSON.stringify(createDataItem(i + j)), noop);
        }

        // Random delay.
        setTimeout(() => {
          next(size);
        }, faker.number.int({ min: 0, max: 100 }));
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
      core1.close();
      core2.close();

      expect(core1.writable).to.be.false;
      expect(core1.stats.totals.uploadedBlocks).to.eq(numBlocks);
      expect(core2.stats.totals.downloadedBlocks).to.eq(numBlocks);
    }
  }).timeout(5_000);

  test('replicates feeds with read stream', async () => {
    const numBlocks = 10;

    const { publicKey, secretKey } = createKeyPair();
    const core1 = factory1.createFeed(publicKey, { secretKey });
    const core2 = factory2.createFeed(publicKey);

    // Open.
    {
      const [ready, done] = latch({ count: 2 });
      core1.open(done);
      core2.open(done);
      await ready();
    }

    expect(core1.opened).to.be.true;
    expect(core2.opened).to.be.true;

    const stream1 = core1.replicate(true, { live: true });
    const stream2 = core2.replicate(false, { live: true });

    const [done, onClose] = latch({ count: 2 });

    // Start replication.
    {
      stream1.pipe(stream2, onClose).pipe(stream1, onClose);

      expect(core1.stats.peers).to.have.lengthOf(1);
      expect(core2.stats.peers).to.have.lengthOf(1);

      let sync = 0;
      core2.on('sync', () => {
        log('sync', { events: ++sync });
      });
    }

    // Writer.
    {
      setTimeout(async () => {
        for (const _ of Array.from(Array(numBlocks))) {
          const block = {
            text: faker.lorem.sentence(),
          };

          core1.append(JSON.stringify(block), noop);
        }
      });
    }

    // Reader.
    {
      const [done, inc] = latch({ count: numBlocks });

      // TODO(burdon): Batch size.
      //  https://github.com/holepunchto/hypercore/tree/v9.12.0#var-stream--feedcreatereadstreamoptions
      setTimeout(async () => {
        for await (const _ of createReadable(core2.createReadStream({ live: true }))) {
          inc();
        }
      });

      await done();

      stream1.end();
      stream2.end();
    }

    await done();
  }).timeout(5_000);
});
