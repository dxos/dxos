//
// Copyright 2019 DXOS.org
//

import { faker } from '@faker-js/faker';
import { expect } from 'chai';

import { latch, sleep, Trigger } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { HypercoreFactory } from './hypercore-factory';
import { createReadable } from './iterator';
import { batch, createDataItem, TestDataItem } from './testing';
import { createStorage, StorageType } from '@dxos/random-access-storage';

const noop = () => { };

describe('Replication', () => {
  const storage = createStorage({ type: StorageType.WEBFS, root: 'x' })
  const factory1 = new HypercoreFactory(storage.createDirectory('one'));
  const factory2 = new HypercoreFactory(storage.createDirectory('two'));

  test('replicates feeds', async () => {
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
      await core1.close();
      await core2.close();

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

  test.only('replication bench', async () => {
    const numBlocks = 10_000;
    const maxRequests = 1024;
    const sparse = true;
    const eagerUpdate = false;
    const linear = true;

    const { publicKey, secretKey } = createKeyPair();

    const core1 = factory1.createFeed(publicKey, { secretKey, writable: true, sparse, eagerUpdate });
    core1.on('error', err => {
      console.error(err);
    })
    // console.log('create')
    // await new Promise((resolve, reject) => core1.open(err => err ? reject(err) : resolve));
    // console.log('OPENED')


    // Write.
    console.log('begin append')
    for (let i = 0; i < numBlocks; i++) {
      await new Promise(resolve => core1.append(`test-${i}`, resolve));
    }
    console.log('end append')

    console.log('begin wait')
    await sleep(5_000);
    console.log('end wait')


    const core2 = factory2.createFeed(publicKey, { sparse, eagerUpdate });
    core2.on('error', err => {
      console.error(err);
    })
    // await new Promise(resolve => core2.open(resolve));


    const begin = performance.now();

    const done = new Trigger();
    const range = core2.download({ start: 0, end: core1.length, linear }, () => done.wake());


    // Replicate.
    {
      console.log("begin replication")
      const reporter = setInterval(() => {
        console.log(core2.stats)
      }, 1000)

      // console.log("BEGIN replication")
      const stream1 = core1.replicate(true, {
        live: true, noise: false,
        encrypted: false,
        maxRequests
      });
      const stream2 = core2.replicate(false, {
        live: true, noise: false,
        encrypted: false,
        maxRequests
      });


      const onClose = err => {
        console.log('onclose')
        if (err && !err.message.includes('Writable stream closed prematurely')) {
          console.error(err)
        }
      }
      stream1.pipe(stream2, onClose).pipe(stream1, onClose);

      // expect(core1.stats.peers).to.have.lengthOf(1);
      // expect(core2.stats.peers).to.have.lengthOf(1);

      // Wait for complete sync.
      core2.on('sync', () => {
        // console.log('SYNC')
        // stream1.end();
        // stream2.end();
      });



      await done.wait();
      // await streamsClosed();

      clearInterval(reporter)
      console.log(await core2.stats)
    }

    const end = performance.now();
    log.info('time', {
      timeMs: end - begin,
      numBlocks, maxRequests, storage: storage.type, sparse, eagerUpdate, linear
    });

    expect(await core2.has(0, numBlocks)).to.eq(true)

    // Close.
    {
      const [closed, close] = latch({ count: 2 });
      core1.on('close', close);
      core2.on('close', close);
      core1.close();
      core2.close();
      await closed();
    }

    // expect(core1.stats.totals.uploadedBlocks).to.eq(numBlocks);
    // expect(core2.stats.totals.downloadedBlocks).to.eq(numBlocks);
  }).timeout(500_000);

});
