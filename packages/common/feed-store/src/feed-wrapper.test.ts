//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import { describe, expect, test } from 'vitest';

import { asyncTimeout, latch, sleep } from '@dxos/async';
import { createReadable } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { range } from '@dxos/util';

import { TestBuilder, TestItemBuilder, defaultValueEncoding } from './testing';

describe('FeedWrapper', () => {
  const factory = new TestBuilder().createFeedFactory();

  test('creates a readable feed', async () => {
    const key = PublicKey.random();
    const feed = await factory.createFeed(key);
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.false;
    await feed.close();
  });

  test('creates a writable feed', async () => {
    const key = PublicKey.random();
    const feed = await factory.createFeed(key, { writable: true });
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.true;
    await feed.close();
  });

  test('creates, opens, and closes a feed multiple times', async () => {
    const key = PublicKey.random();
    const feed = await factory.createFeed(key);

    await feed.open();
    expect(feed.properties.opened).to.be.true;
    expect(feed.properties.closed).to.be.false;
    await feed.open();

    await feed.close();
    expect(feed.properties.opened).to.be.true;
    expect(feed.properties.closed).to.be.true;
    await feed.close();
  });

  test('appends blocks', async () => {
    const numBlocks = 10;
    const builder = new TestBuilder();
    const feedFactory = builder.createFeedFactory();
    const key = await builder.keyring!.createKey();
    const feed = await feedFactory.createFeed(key, { writable: true });

    for (const _ of Array.from(Array(numBlocks)).keys()) {
      await feed.append(faker.lorem.sentence());
    }

    expect(feed.properties.length).to.eq(numBlocks);
  });

  test('append emits event', async () => {
    const numBlocks = 10;
    const builder = new TestBuilder();
    const feedFactory = builder.createFeedFactory();
    const key = await builder.keyring!.createKey();
    const feed = await feedFactory.createFeed(key, { writable: true });

    let emittedAppend = 0;
    feed.on('append', () => {
      emittedAppend++;
    });

    for (const _ of Array.from(Array(numBlocks)).keys()) {
      await feed.append(faker.lorem.sentence());
    }
    expect(emittedAppend).to.eq(numBlocks);
  });

  test('appends blocks with encoding', async () => {
    const numBlocks = 10;
    const builder = new TestItemBuilder();
    const feedFactory = builder.createFeedFactory();
    const key = await builder.keyring!.createKey();
    const feed = await feedFactory.createFeed(key, {
      writable: true,
      valueEncoding: defaultValueEncoding,
    });

    for (const i of Array.from(Array(numBlocks)).keys()) {
      await feed.append({
        id: String(i + 1),
        value: faker.lorem.sentence(),
      } as any);
    }

    expect(feed.properties.length).to.eq(numBlocks);
    const { id } = await feed.get(0);
    expect(id).to.eq('1');
  });

  // TODO(dmaretskyi): fix test.
  test.skip('reads blocks from a feed stream', async () => {
    const numBlocks = 10;
    const builder = new TestBuilder();
    const factory = builder.createFeedFactory();
    const key = await builder.keyring.createKey();
    const feed = await factory.createFeed(key, {
      writable: true,
      valueEncoding: defaultValueEncoding,
    });

    // TODO(burdon): Use generator.
    for (const i of Array.from(Array(numBlocks)).keys()) {
      await sleep(faker.number.int({ min: 0, max: 20 }));
      await feed.append({
        id: String(i + 1),
        value: faker.lorem.sentence(),
      });
    }

    const [done, inc] = latch({ count: numBlocks });
    setTimeout(async () => {
      for await (const block of createReadable(feed.createReadableStream())) {
        const { id } = block;
        const i = inc();
        expect(id).to.eq(String(i));
      }
    });

    await done();
  });

  test('replicates with streams', async () => {
    const numBlocks = 10;
    const builder = new TestItemBuilder();
    const feedFactory = builder.createFeedFactory();

    const key1 = await builder.keyring!.createKey();
    const feed1 = await feedFactory.createFeed(key1, { writable: true });
    const feed2 = await feedFactory.createFeed(key1);

    await feed1.open();
    await feed2.open();

    const stream1 = feed1.replicate(true, { live: true, noise: false, encrypted: false });
    const stream2 = feed2.replicate(false, { live: true, noise: false, encrypted: false });

    const [done, onClose] = latch({ count: 2 });

    // Start replication.
    {
      stream1.pipe(stream2, onClose).pipe(stream1, onClose);

      expect(feed1.properties.stats.peers).to.have.lengthOf(1);
      expect(feed2.properties.stats.peers).to.have.lengthOf(1);

      feed2.core.on('sync', () => {
        log('sync');
      });
    }

    // Writer.
    {
      const writer = feed1.createFeedWriter();
      for (const i of Array.from(Array(numBlocks).keys())) {
        const block = {
          id: String(i + 1),
          index: i,
          value: faker.lorem.sentence(),
        };

        const seq = await writer.write(block);
        log('write', { seq, block });
      }
    }

    // Reader.
    await asyncTimeout(feed2.get(numBlocks - 1, { wait: true }), 500);
    expect(feed2.properties.length).to.eq(numBlocks);

    stream1.end();
    stream2.end();

    await done();
  });

  test('cancel download while replicating', async () => {
    const numBlocks = 10;
    const builder = new TestItemBuilder();
    const feedFactory = builder.createFeedFactory();

    const key1 = await builder.keyring!.createKey();
    const feed1 = await feedFactory.createFeed(key1, { writable: true });
    const feed2 = await feedFactory.createFeed(key1, { sparse: true });

    await feed1.open();
    await feed2.open();

    const stream1 = feed1.replicate(true, { live: true, noise: false, encrypted: false });
    const stream2 = feed2.replicate(false, { live: true, noise: false, encrypted: false });

    // Start replication.
    {
      stream1.pipe(stream2).pipe(stream1);

      expect(feed1.properties.stats.peers).to.have.lengthOf(1);
      expect(feed2.properties.stats.peers).to.have.lengthOf(1);
    }

    // Writer.
    {
      const writer = feed1.createFeedWriter();
      const write = async (index: number) => {
        const block = {
          id: String(index + 1),
          index,
          value: faker.lorem.sentence(),
        };
        await writer.write(block);
      };

      for (const i of Array.from(Array(numBlocks).keys())) {
        await write(i);
      }
    }

    // Reader.
    {
      const start = 5;
      feed2.download({ start, linear: true }, (err: Error | null) => {
        if (err) {
          throw err;
        }
      });
      await expect.poll(() => feed2.has(start), { timeout: 500 }).toBe(true);
      for (const i of range(numBlocks)) {
        expect(feed2.has(i)).to.eq(i >= start);
      }
    }
  });

  test('proofs', async () => {
    const numBlocks = 10;
    const builder1 = new TestItemBuilder();
    const builder2 = new TestItemBuilder();
    const feedFactory1 = builder1.createFeedFactory();
    const feedFactory2 = builder2.createFeedFactory();

    const key1 = await builder1.keyring!.createKey();
    const feed1 = await feedFactory1.createFeed(key1, { writable: true });
    const feed2 = await feedFactory2.createFeed(key1);

    await feed1.open();
    await feed2.open();

    for (const i of range(numBlocks)) {
      await feed1.append(`block-${i}` as any);
    }

    for (const i of range(numBlocks)) {
      const data = await feed1.get(i);

      console.log({ data });

      const proof = await feed1.proof(i);

      // proof.signature[2] = 0xff;

      console.log('proof', inspect({ proof }, { depth: null, colors: true }));

      await feed2.core.put(i, data, proof);

      console.log({ data2: await feed2.get(i) });
    }

    feed2.core.audit((err, valid) => {
      console.log('audit', { err, valid });
    });
  });

  test('integrates blocks via putBuffer', async () => {
    const numBlocks = 5;
    const builder = new TestBuilder();
    const feedFactory = builder.createFeedFactory();

    const key = await builder.keyring.createKey();
    const source = await feedFactory.createFeed(key, { writable: true });
    const target = await feedFactory.createFeed(key);

    await source.open();
    await target.open();

    // Append to source.
    for (let i = 0; i < numBlocks; i++) {
      await source.append(faker.lorem.sentence() as any);
    }

    // Integrate into target via putBuffer using proofs from source.
    for (let i = 0; i < numBlocks; i++) {
      const data = (await source.get(i, { valueEncoding: 'binary' })) as Uint8Array;
      const proof = await source.proof(i);
      await target.putBuffer(i, data, proof, null);
    }

    // Verify data and length.
    expect(target.length).to.eq(numBlocks);
    for (let i = 0; i < numBlocks; i++) {
      const src = (await source.get(i, { valueEncoding: 'binary' })) as Uint8Array;
      const dst = (await target.get(i, { valueEncoding: 'binary' })) as Uint8Array;
      expect(Buffer.from(dst).equals(Buffer.from(src))).to.be.true;
    }
  });
});
