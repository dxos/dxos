//
// Copyright 2019 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';
import hypercore from 'hypercore';
import ram from 'random-access-memory';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';

import { createReadable } from './streams';
import { batch, createDataItem, TestDataItem } from './testing';

// TODO(burdon): Add logging.
// TODO(burdon): Factor out table logger.
const logRow = (label: string, values: number[]) => {
  // console.log(`${label.padEnd(6)} ${values.map(value => String(value).padStart(3)).join(' ')}`);
};

const noop = () => {};

describe('Hypercore replication', function () {
  it('replicates feeds', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const core1 = hypercore(ram, publicKey, { secretKey });
    const core2 = hypercore(ram, publicKey);

    // Open.
    {
      const [ready, done] = latch({ count: 2 });
      core1.open(done);
      core2.open(done);
      await ready();
    }

    const numBlocks = 10;

    // Sync.
    {
      const stream1 = core1.replicate(true);
      const stream2 = core2.replicate(false);

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

  it('replicates feeds in batches', async function () {
    const numBlocks = 100;

    // Replicating feeds must have the same public key.
    const { publicKey, secretKey } = createKeyPair();
    const core1 = hypercore(ram, publicKey, { secretKey });
    const core2 = hypercore(ram, publicKey);

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
        logRow(' up', [uploaded, core1.length]);
      });

      // Monitor downloads.
      let downloaded = 0;
      core2.on('download', (seq: number, data: Buffer) => {
        downloaded++;
        const { id } = JSON.parse(data.toString()) as TestDataItem;
        expect(id).to.eq(seq);
        logRow(' down', [downloaded, core2.length]);
        expect(downloaded).to.be.lessThanOrEqual(uploaded);
        incDownload();
      });

      // Monitor sync points (multiple since delayed writes).
      const sync = { started: 0, complete: 0 };
      core2.on('sync', () => {
        logRow('=sync=', [++sync.started]);
        core2.download();
      });

      // Write batch of messages with delay.
      batch((next, i, remaining) => {
        const size = faker.datatype.number({ min: 1, max: Math.min(10, remaining) });
        for (let j = 0; j < size; j++) {
          core1.append(JSON.stringify(createDataItem(i + j)), noop);
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
      await core1.close();
      await core2.close();

      expect(core1.writable).to.be.false;
      expect(core1.stats.totals.uploadedBlocks).to.eq(numBlocks);
      expect(core2.stats.totals.downloadedBlocks).to.eq(numBlocks);
    }
  }).timeout(5_000);

  it('replicates feeds with read stream', async function () {
    const numBlocks = 10;

    const { publicKey, secretKey } = createKeyPair();
    const core1 = hypercore(ram, publicKey, { secretKey });
    const core2 = hypercore(ram, publicKey);

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
        logRow('=sync=', [++sync]);
      });
    }

    // Writer.
    {
      setTimeout(async () => {
        for (const _ of Array.from(Array(numBlocks))) {
          const block = {
            text: faker.lorem.sentence()
          };

          core1.append(JSON.stringify(block), noop);
        }
      });
    }

    // Reader.
    {
      const [done, inc] = latch({ count: numBlocks });

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
