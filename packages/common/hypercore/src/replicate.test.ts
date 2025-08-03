//
// Copyright 2019 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger, latch, sleep } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { TRACE_PROCESSOR } from '@dxos/tracing';
import { range, sum } from '@dxos/util';

import { HypercoreFactory } from './hypercore-factory';
import { createReadable } from './iterator';
import { type TestDataItem, batch, createDataItem } from './testing';

const noop = () => {};

describe('Replication', () => {
  const storage = createStorage({ type: StorageType.RAM, root: 'x' });
  const factory1 = new HypercoreFactory(storage.createDirectory('one'));
  const factory2 = new HypercoreFactory(storage.createDirectory('two'));

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
        setTimeout(
          () => {
            next(size);
          },
          faker.number.int({ min: 0, max: 100 }),
        );
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
  });

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
  });

  test.skip('replication bench', { timeout: 500_000 }, async () => {
    const numBlocks = 1_000;
    const maxRequests = 1024;
    const sparse = true;
    const eagerUpdate = false;
    const linear = false;

    const { publicKey, secretKey } = createKeyPair();

    const core1 = factory1.createFeed(publicKey, { secretKey, writable: true, sparse, eagerUpdate });
    core1.on('error', (err) => {
      console.error(err);
    });
    // console.log('create')
    // await new Promise((resolve, reject) => core1.open(err => err ? reject(err) : resolve));
    // console.log('OPENED')

    // Write.
    console.log('begin append');
    const appendChunk = 100;
    for (let i = 0; i < numBlocks / appendChunk; i++) {
      const blocks = range(appendChunk).map((x) => `test-${i * appendChunk + x}`);
      await new Promise((resolve) => core1.append(blocks, resolve));
    }
    expect(core1.length).to.eq(numBlocks);
    console.log('end append');

    console.log('begin wait');
    await sleep(1_000);
    console.log('end wait');

    let lastHeartbeat = performance.now();
    const heartbeat = setInterval(() => {
      const now = performance.now();
      console.log(`heartbeat dt=${now - lastHeartbeat}ms time=${now}`);
      lastHeartbeat = now;
    }, 500);

    const core2 = factory2.createFeed(publicKey, { sparse, eagerUpdate });
    core2.on('error', (err) => {
      console.error(err);
    });
    // await new Promise(resolve => core2.open(resolve));

    const begin = performance.now();

    const done = new Trigger();
    core2.download({ start: 0, end: core1.length, linear }, () => done.wake());

    // Replicate.
    {
      console.log('begin replication');
      const reporter = setInterval(() => {
        console.log(core2.stats);
      }, 1000);

      // console.log("BEGIN replication")
      const stream1 = core1.replicate(true, {
        live: true,
        noise: false,
        encrypted: false,
        maxRequests,
      });
      const stream2 = core2.replicate(false, {
        live: true,
        noise: false,
        encrypted: false,
        maxRequests,
      });

      const onClose = (err: any) => {
        console.log('onclose');
        if (err && !err.message.includes('Writable stream closed prematurely')) {
          console.error(err);
        }
      };
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

      clearInterval(reporter);
      console.log(await core2.stats);
    }

    const end = performance.now();

    // Make sure flushes are counted.
    await sleep(1000);

    TRACE_PROCESSOR.refresh();

    // console.log(inspect(TRACE_PROCESSOR.findResourcesByClassName('WebFile').map(r => [
    //   r.data.info._fileName,
    //   ...r.data.metrics!.map(m => [m.name, m.timeSeries!.tracks![0].total])
    // ])), false, null, true)
    const totalFlushes = sum(
      TRACE_PROCESSOR.findResourcesByClassName('WebFile').map(
        (resource) => resource.getMetric('_flushes')!.timeSeries!.tracks![0].total,
      ),
    );

    log.info('time', {
      timeMs: end - begin,
      numBlocks,
      maxRequests,
      storage: storage.type,
      sparse,
      eagerUpdate,
      linear,
      totalFlushes,
    });

    expect(await core2.has(0, numBlocks)).to.eq(true);

    // Close.
    {
      const [closed, close] = latch({ count: 2 });
      core1.on('close', close);
      core2.on('close', close);
      core1.close();
      core2.close();
      await closed();
    }

    clearInterval(heartbeat);

    // expect(core1.stats.totals.uploadedBlocks).to.eq(numBlocks);
    // expect(core2.stats.totals.downloadedBlocks).to.eq(numBlocks);
  });
});
