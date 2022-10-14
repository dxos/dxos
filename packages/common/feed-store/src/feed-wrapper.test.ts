//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { FeedWrapper } from './feed-wrapper';
import { TestBuilder } from './testing';

// TODO(burdon): Test codec/proto encoding.

describe('FeedWrapper', function () {
  const factory = new TestBuilder().createFeedFactory();

  it('Creates a readable feed', async function () {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key), key);
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.false;
    await feed.close();
  });

  it('Creates a writable feed', async function () {
    const key = PublicKey.random();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();
    expect(feed.properties.readable).to.be.true;
    expect(feed.properties.writable).to.be.true;
    await feed.close();
  });

  it('Creates, opens, and closes a feed multiple times', async function () {
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

  it('Appends blocks', async function () {
    const builder = new TestBuilder();
    const feedFactory = builder.createFeedFactory();
    const feedKey = await builder.keyring!.createKey();
    const feed = await feedFactory.createFeed(feedKey, { writable: true });

    const numBlocks = 10;
    for (const _ of Array.from(Array(numBlocks))) {
      await feed.append(faker.lorem.sentence());
    }
  });

  it('Reads blocks from a feed stream', async function () {
    const builder = new TestBuilder();
    const factory = builder.createFeedFactory();
    const key = await builder.keyring.createKey();
    const feed = factory.createFeed(key, { writable: true });

    const numBlocks = 10;
    for (const i of Array.from(Array(numBlocks)).keys()) {
      await sleep(faker.datatype.number({ min: 0, max: 20 }));
      await feed.append(JSON.stringify({
        id: i + 1,
        text: faker.lorem.sentence()
      }));
    }

    const feedStream = feed.createReadStream({ live: true }) as any;

    // TODO(burdon): Move issue to hypercore (possible wrapper?)
    // import { Readable } from 'readable-stream';
    // https://nodejs.org/dist/v18.9.0/docs/api/stream.html#readablewrapstream
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
    // const feedIterable = new Readable().wrap(feedStream as any);

    const [done, inc] = latch({ count: numBlocks });
    setTimeout(async () => {
      for await (const block of feedStream as any) {
        const { id } = JSON.parse(String(block));
        const i = inc();
        // console.log(block.toString());
        expect(id).to.eq(i);
      }
    });

    await done();
  });

  it('Replicates with streams', async function () {
    const builder = new TestBuilder();
    const feedFactory = builder.createFeedFactory();

    const key1 = await builder.keyring!.createKey();
    const key2 = await builder.keyring!.createKey();

    // TODO(burdon): ABOVE!!!
    const feed1 = new FeedWrapper(feedFactory.createFeed(key1, { writable: true }), key1);
    const feed2 = new FeedWrapper(feedFactory.createFeed(key2), key2);

    await feed1.open();
    await feed2.open();

    const stream1 = feed1.replicate(true);
    const stream2 = feed2.replicate(false);

    const [done, onClose] = latch({ count: 2 });
    stream1.pipe(stream2, onClose).pipe(stream1, onClose);

    expect(feed1.properties.stats.peers).to.have.lengthOf(1);
    expect(feed2.properties.stats.peers).to.have.lengthOf(1);

    const numBlocks = 10;

    // Writer.
    {
      setTimeout(async () => {
        for (const _ of Array.from(Array(numBlocks))) {
          await feed1.append(JSON.stringify({
            text: faker.lorem.sentence()
          }));

          console.log('write');
        }
      });
    }

    // Reader.
    {
      const [done, inc] = latch({ count: numBlocks });

      setTimeout(async () => {
        // const feedStream = feed2.createReadStream({ live: true }) as any;
        for await (const block of stream2 as any) {
          // const { id } = JSON.parse(String(block));
          console.log(block.toString());
          inc();
        }
      });

      await done();
    }

    await done();
  });
});
