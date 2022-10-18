//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { FeedWrapper } from './feed-wrapper';
import { FeedWriterImpl } from './feed-writer';
import { defaultValueEncoding, TestBuilder, TestItem, TestItemBuilder } from './testing';

describe('FeedWrapper', function () {
  const factory = new TestBuilder().createFeedFactory();

  it('creates a readable feed', async function () {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key), key);
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.false;
    await feed.close();
  });

  it('creates a writable feed', async function () {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.true;
    await feed.close();
  });

  it('creates, opens, and closes a feed multiple times', async function () {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key), key);

    await feed.open();
    expect(feed.properties.opened).to.be.true;
    expect(feed.properties.closed).to.be.false;
    await feed.open();

    await feed.close();
    expect(feed.properties.opened).to.be.true;
    expect(feed.properties.closed).to.be.true;
    await feed.close();
  });

  it('appends blocks', async function () {
    const numBlocks = 10;
    const builder = new TestBuilder();
    const feedFactory = builder.createFeedFactory();
    const key = await builder.keyring!.createKey();
    const feed = new FeedWrapper(feedFactory.createFeed(key, { writable: true }), key);

    for (const _ of Array.from(Array(numBlocks)).keys()) {
      await feed.append(faker.lorem.sentence());
    }

    expect(feed.properties.length).to.eq(numBlocks);
  });

  it('appends blocks with encoding', async function () {
    const numBlocks = 10;
    const builder = new TestBuilder();
    const feedFactory = builder.createFeedFactory();
    const key = await builder.keyring!.createKey();
    const feed = new FeedWrapper<TestItem>(feedFactory.createFeed(key, {
      writable: true,
      valueEncoding: defaultValueEncoding
    }), key);

    for (const i of Array.from(Array(numBlocks)).keys()) {
      await feed.append({
        id: String(i + 1),
        value: faker.lorem.sentence()
      });
    }

    expect(feed.properties.length).to.eq(numBlocks);
    const { id } = await feed.get(0);
    expect(id).to.eq('1');
  });

  it('reads blocks from a feed stream', async function () {
    const numBlocks = 10;
    const builder = new TestBuilder();
    const factory = builder.createFeedFactory();
    const key = await builder.keyring.createKey();
    const feed = new FeedWrapper(factory.createFeed(key, {
      writable: true,
      valueEncoding: defaultValueEncoding
    }), key);

    // TODO(burdon): Use generator.
    for (const i of Array.from(Array(numBlocks)).keys()) {
      await sleep(faker.datatype.number({ min: 0, max: 20 }));
      await feed.append({
        id: String(i + 1),
        value: faker.lorem.sentence()
      });
    }

    const [done, inc] = latch({ count: numBlocks });
    setTimeout(async () => {
      for await (const block of feed.createReadableStream()) {
        const { id } = block;
        const i = inc();
        expect(id).to.eq(String(i));
      }
    });

    await done();
  });

  it('replicates with streams', async function () {
    const numBlocks = 10;
    const builder = new TestItemBuilder();
    const feedFactory = builder.createFeedFactory();

    const key1 = await builder.keyring!.createKey();
    const feed1 = new FeedWrapper(feedFactory.createFeed(key1, { writable: true }), key1);
    const feed2 = new FeedWrapper(feedFactory.createFeed(key1), key1);

    await feed1.open();
    await feed2.open();

    const stream1 = feed1.replicate(true, { live: true });
    const stream2 = feed2.replicate(false, { live: true });

    const [done, onClose] = latch({ count: 2 });

    // Start replication.
    {
      stream1.pipe(stream2, onClose).pipe(stream1, onClose);

      expect(feed1.properties.stats.peers).to.have.lengthOf(1);
      expect(feed2.properties.stats.peers).to.have.lengthOf(1);

      feed2.core.on('sync', () => {
        log('S');
      });
    }

    // Writer.
    {
      const writer = new FeedWriterImpl(feed1.core);
      setTimeout(async () => {
        for (const i of Array.from(Array(numBlocks).keys())) {
          const block = {
            id: String(i + 1),
            value: faker.lorem.sentence()
          };

          const seq = await writer.write(block);
          log('W', { seq, block });
        }
      });
    }

    // Reader.
    {
      const [done, inc] = latch({ count: numBlocks });

      setTimeout(async () => {
        for await (const block of feed2.createReadableStream()) {
          log('R', block);
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
