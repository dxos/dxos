//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import Chance from 'chance';
import debug from 'debug';
import from2 from 'from2';
import ram from 'random-access-memory';
import waitForExpect from 'wait-for-expect';

import { Codec } from '@dxos/codec-protobuf';
import { createId } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { dxos } from './proto/gen/bundle';
import TestingSchema from './proto/gen/testing.json';

const log = debug('dxos:echo:testing');
debug.enable('dxos:echo:*');

const chance = new Chance();

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

// TODO(burdon): Factor out?
interface IBlock {
  data: dxos.echo.testing.Envelope
}

interface IReadableStream {
  on (event: string, callback: object): void;
}

const getOrSet = (map: Map<string, any>, key: string, constructor: Function) => {
  let value = map.get(key);
  if (value === undefined) {
    value = constructor();
    map.set(key, value);
  }

  return value;
};

/**
 * Consumes a message queue and provides streamable queries.
 */
class Streamer {
  // Map of arrays by tag.
  _index = new Map();

  // Map of subscriptions by tag.
  _subscriptions = new Map();

  constructor (stream: IReadableStream) {
    stream.on('data', (block: IBlock) => {
      const { data: { message } } = block;
      const { id, tag } = (message as dxos.echo.testing.TestMessage);

      const values = getOrSet(this._index, tag, Array);
      values.push(id);

      (this._subscriptions.get(tag) || []).forEach((callback: Function) => callback(id));
    });

    // TODO(burdon): Flush all subscriptions on close.
  }

  query(tag: string): IReadableStream {
    // TODO(burdon): Use model to manage order?
    const queue = this._index.get(tag) || [];

    let pending: Function | undefined;
    getOrSet(this._subscriptions, tag, Array).push((value: string) => {
      assert(value !== undefined);
      queue.push(value);

      if (pending) {
        pending();
      }
    });

    // TODO(burdon): Is this the right way to do streams?
    return from2.obj((size: number, next: Function) => {
      assert(!pending);
      if (queue.length) {
        next(null, queue.splice(0, size));
      } else {
        pending = () => {
          pending = undefined;
          next(null, queue.splice(0, size));
        };
      }
    });
  }
}

/**
 * FeedStore Streams with encoding.
 */
test('message query streams', async () => {
  const config = {
    numFeeds: 5,
    numBlocks: 100,
    tags: ['red', 'green', 'blue']
  };

  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  await feedStore.open();

  // Create feeds.
  for (let i = 0; i < config.numFeeds; i++) {
    await feedStore.openFeed(`feed-${i}`);
  }

  const descriptors = feedStore.getDescriptors();
  expect(descriptors).toHaveLength(config.numFeeds);

  // Create messages.
  const counters = new Map();
  for (let i = 0; i < config.numBlocks; i++) {
    const { feed } = chance.pickone(descriptors);
    const tag = chance.pickone(config.tags);
    await feed.append({
      message: {
        __type_url: 'dxos.echo.testing.TestMessage',
        id: createId(),
        tag
      }
    });

    counters.set(tag, (counters.get(tag) || 0) + 1);
  }

  // Get query stream.
  const stream = feedStore.createReadStream({ live: true });
  const streamer = new Streamer(stream);

  let count = 0;
  const results = streamer.query('red');
  results.on('data', (message: dxos.echo.testing.TestMessage) => {
    count++;
  });

  await waitForExpect(() => {
    expect(count).toBe(counters.get('red'));
    feedStore.close();
  });
});
