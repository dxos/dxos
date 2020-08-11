//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { EventEmitter } from 'events';
import ram from 'random-access-memory';

import { keyToString } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { Codec } from '@dxos/codec-protobuf';

import { createWritableFeedStream } from './database';
import { FeedStoreIterator } from './feed-store-iterator';
import { assumeType, latch, sink } from './util';
import { createAdmit, createRemove, createMessage, feedItem } from './testing';

import TestingSchema from './proto/gen/testing.json';
import { dxos } from './proto/gen/testing';

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

const setup = async (paths: string[]) => {
  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  await feedStore.open();

  const feeds = await Promise.all(paths.map(path => feedStore.openFeed(path)));
  const descriptors = feeds.map(feed => feedStore.getDescriptors().find(descriptor => descriptor.feed === feed)!);
  const streams = feeds.map(feed => createWritableFeedStream(feed));

  return { feedStore, feeds, descriptors, streams };
};

/* eslint-disable no-lone-blocks */
describe('FeedStoreIterator', () => {
  test('single feed', async () => {
    const { feedStore, streams } = await setup(['feed-1']);

    streams[0].write(createMessage(1));
    streams[0].write(createMessage(2));
    streams[0].write(createMessage(3));

    const iterator = await FeedStoreIterator.create(feedStore, async () => true);

    const messages = [];
    for await (const message of iterator) {
      messages.push(message);
      if (messages.length === 3) {
        break;
      }
    }

    expect(messages).toEqual([
      feedItem(createMessage(1)),
      feedItem(createMessage(2)),
      feedItem(createMessage(3))
    ]);
  });

  test('one allowed feed & one locked', async () => {
    const { feedStore, streams, descriptors } = await setup(['feed-1', 'feed-2']);

    streams[0].write(createMessage(1));
    streams[1].write(createMessage(2));
    streams[0].write(createMessage(3));

    const iterator = await FeedStoreIterator.create(feedStore, async feedKey => feedKey === descriptors[0].key);

    const messages = [];
    for await (const message of iterator) {
      messages.push(message);
      if (messages.length === 2) { break; }
    }

    expect(messages).toEqual([
      feedItem(createMessage(1)),
      feedItem(createMessage(3))
    ]);
  });

  test('feed added while iterating', async () => {
    const { feedStore, streams } = await setup(['feed-1']);

    const iterator = await FeedStoreIterator.create(feedStore, async () => true);

    const [count, incCount] = latch(3);
    const messages: any[] = [];
    setImmediate(async () => {
      for await (const message of iterator) {
        messages.push(message);
        incCount();
      }
    });

    streams[0].write(createMessage(1));
    streams[0].write(createMessage(2));
    streams[0].write(createMessage(3));
    await count;

    expect(messages).toEqual([
      feedItem(createMessage(1)),
      feedItem(createMessage(2)),
      feedItem(createMessage(3))
    ]);
  });

  test('dynamically authorizing other feeds', async () => {
    const { feedStore, streams, descriptors } = await setup(['feed-1', 'feed-2']);

    const authenticatedFeeds = new Set<string>([keyToString(descriptors[0].key)]);
    const iterator = await FeedStoreIterator.create(feedStore, async feedKey => {
      return authenticatedFeeds.has(keyToString(feedKey));
    });

    const messages: any[] = [];
    const eventEmitter = new EventEmitter();
    setImmediate(async () => {
      for await (const message of iterator) {
        messages.push(message);

        switch (message.data.message.__type_url) {
          // TODO(burdon): Convert to mutation.
          case 'dxos.echo.testing.TestData':
            break;

          case 'dxos.echo.testing.Admit': {
            assumeType<dxos.echo.testing.IAdmit>(message.data.message);
            const { feedKey } = message.data.message;
            assert(feedKey);
            authenticatedFeeds.add(keyToString(feedKey));
            break;
          }

          case 'dxos.echo.testing.Remove': {
            assumeType<dxos.echo.testing.IRemove>(message.data.message);
            const { feedKey } = message.data.message;
            assert(feedKey);
            assert(authenticatedFeeds.has(keyToString(feedKey)));
            authenticatedFeeds.delete(keyToString(feedKey));
            break;
          }

          default:
            throw new Error(`Unexpected message type: ${message.data.message.__type_url}`);
        }

        eventEmitter.emit('update', message);
      }
    });

    // Expect non-admitted messages to be held.
    {
      const promise = sink(eventEmitter, 'update', 2);

      streams[0].write(createMessage(1));
      streams[1].write(createMessage(2)); // Should be held.
      streams[0].write(createMessage(3));

      await promise;

      expect(messages).toEqual([
        feedItem(createMessage(1)),
        feedItem(createMessage(3))
      ]);
    }

    // Release held message by admitting feed.
    {
      const promise = sink(eventEmitter, 'update', 2);

      streams[0].write(createAdmit(descriptors[1].key));

      await promise;

      expect(messages).toEqual([
        feedItem(createMessage(1)),
        feedItem(createMessage(3)),
        feedItem(createAdmit(descriptors[1].key)),
        feedItem(createMessage(2)) // Now released
      ]);
    }

    // Remove feed and test subsequent messages are held.
    {
      const promise1 = sink(eventEmitter, 'update', 1);

      streams[1].write(createRemove(descriptors[0].key));

      await promise1;

      // NOTE: Race condition possible.
      // If we don't wait here, the next write goes ahead since the remove hasn't been processed.
      const promise2 = sink(eventEmitter, 'update', 1);

      streams[0].write(createMessage(4)); // Should be held.
      streams[1].write(createMessage(5));

      await promise2;

      expect(messages).toEqual([
        feedItem(createMessage(1)),
        feedItem(createMessage(3)),
        feedItem(createAdmit(descriptors[1].key)),
        feedItem(createMessage(2)),
        feedItem(createRemove(descriptors[0].key)),
        feedItem(createMessage(5))
      ]);
    }
  });
});
