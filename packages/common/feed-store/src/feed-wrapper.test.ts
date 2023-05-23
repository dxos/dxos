//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch, sleep } from '@dxos/async';
import { createReadable } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { FeedWrapper } from './feed-wrapper';
import { defaultValueEncoding, TestBuilder, TestItem, TestItemBuilder } from './testing';

describe('FeedWrapper', () => {
  const factory = new TestBuilder().createFeedFactory();

  test('creates a readable feed', async () => {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key), key);
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.false;
    await feed.close();
  });

  test('creates a writable feed', async () => {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.true;
    await feed.close();
  });

  test('creates, opens, and closes a feed multiple times', async () => {
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

  test('appends blocks', async () => {
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

  test('append emits event', async () => {
    const numBlocks = 10;
    const builder = new TestBuilder();
    const feedFactory = builder.createFeedFactory();
    const key = await builder.keyring!.createKey();
    const feed = new FeedWrapper(feedFactory.createFeed(key, { writable: true }), key);

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
    const feed = new FeedWrapper<TestItem>(
      feedFactory.createFeed(key, {
        writable: true,
        valueEncoding: defaultValueEncoding,
      }),
      key,
    );

    for (const i of Array.from(Array(numBlocks)).keys()) {
      await feed.append({
        id: String(i + 1),
        value: faker.lorem.sentence(),
      });
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
    const feed = new FeedWrapper(
      factory.createFeed(key, {
        writable: true,
        valueEncoding: defaultValueEncoding,
      }),
      key,
    );

    // TODO(burdon): Use generator.
    for (const i of Array.from(Array(numBlocks)).keys()) {
      await sleep(faker.datatype.number({ min: 0, max: 20 }));
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

  // TODO(dmaretskyi): fix test.
  test
    .skip('replicates with streams', async () => {
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
          log('sync');
        });
      }

      // Writer.
      {
        const writer = feed1.createFeedWriter();
        setTimeout(async () => {
          for (const i of Array.from(Array(numBlocks).keys())) {
            const block = {
              id: String(i + 1),
              index: i,
              value: faker.lorem.sentence(),
            };

            const seq = await writer.write(block);
            log('write', { seq, block });
          }
        });
      }

      // Reader.
      {
        const [done, inc] = latch({ count: numBlocks });

        setTimeout(async () => {
          for await (const block of createReadable(feed2.createReadableStream())) {
            log('read', block);
            inc();
          }
        });

        await done();

        stream1.end();
        stream2.end();
      }

      await done();
    })
    .timeout(5_000);
});
