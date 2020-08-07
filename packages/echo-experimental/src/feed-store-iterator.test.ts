//
// Copyright 2020 DXOS.org
//

import ram from 'random-access-memory';
import waitForExpect from 'wait-for-expect';
import assert from 'assert';

import { FeedStore } from '@dxos/feed-store';
import { Codec } from '@dxos/codec-protobuf';

import { createWritableFeedStream } from './database';
import { FeedStoreIterator } from './feed-store-iterator';
import TestingSchema from './proto/gen/testing.json';
import { assumeType } from './util';
import { dxos } from './proto/gen/testing';

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

const setup = async (feedNames: string[]) => {
  // TODO(burdon): Deleting all tests that do not use protocol buffers!
  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  await feedStore.open();

  const feeds = await Promise.all(feedNames.map(name => feedStore.openFeed(name)));
  const descriptors = feeds.map(feed => feedStore.getDescriptors().find(descriptor => descriptor.feed === feed)!);
  const streams = feeds.map(feed => createWritableFeedStream(feed));
  return { feedStore, feeds, descriptors, streams };
};

const testMessage = (data: number) => ({
  message: {
    __type_url: 'dxos.echo.testing.TestData',
    data
  }
});

const testAdmit = (feedKey: Buffer) => ({
  message: {
    __type_url: 'dxos.echo.testing.Admit',
    feedKey: feedKey.toString('hex')
  }
});

const testRemove = (feedKey: Buffer) => ({
  message: {
    __type_url: 'dxos.echo.testing.TestFeedRemove',
    feedKey: feedKey.toString('hex')
  }
});

describe('FeedStoreIterator', () => {
  test('single feed', async () => {
    const { feedStore, streams } = await setup(['feed']);

    streams[0].write(testMessage(1));
    streams[0].write(testMessage(2));
    streams[0].write(testMessage(3));

    const iterator = await FeedStoreIterator.create(feedStore, async () => true);

    const messages = [];
    for await (const msg of iterator) {
      messages.push(msg);
      if (messages.length === 3) { break; }
    }

    expect(messages).toEqual([
      { data: testMessage(1) },
      { data: testMessage(2) },
      { data: testMessage(3) }
    ]);
  });

  test('one allowed feed & one locked', async () => {
    const { feedStore, streams, descriptors } = await setup(['feed-1', 'feed-2']);

    streams[0].write(testMessage(1));
    streams[1].write(testMessage(2));
    streams[0].write(testMessage(3));

    const iterator = await FeedStoreIterator.create(feedStore, async feedKey => feedKey.equals(descriptors[0].key));

    const messages = [];
    for await (const msg of iterator) {
      messages.push(msg);
      if (messages.length === 2) { break; }
    }

    expect(messages).toEqual([
      { data: testMessage(1) },
      { data: testMessage(3) }
    ]);
  });

  test('dynamically authorizing other feeds', async () => {
    const { feedStore, streams, descriptors } = await setup(['feed-1', 'feed-2']);

    streams[0].write(testMessage(1));
    streams[1].write(testMessage(2));
    streams[0].write(testMessage(3));

    const authenticatedFeeds = new Set([descriptors[0].key.toString('hex')]);
    const iterator = await FeedStoreIterator.create(feedStore, async feedKey => authenticatedFeeds.has(feedKey.toString('hex')));

    const messages: any[] = [];
    setImmediate(async () => {
      for await (const msg of iterator) {
        messages.push(msg);
        switch (msg.data.message.__type_url) {
          case 'dxos.echo.testing.TestData':
            break;

          case 'dxos.echo.testing.Admit': {
            assumeType<dxos.echo.testing.IAdmit>(msg.data.message);
            const { feedKey } = msg.data.message;
            assert(feedKey);
            authenticatedFeeds.add(feedKey);
            break;
          }

          case 'dxos.echo.testing.TestFeedRemove': {
            assumeType<dxos.echo.testing.ITestFeedRemove>(msg.data.message);
            const { feedKey } = msg.data.message;
            assert(feedKey);
            authenticatedFeeds.delete(feedKey);
            break;
          }

          default:
            throw new Error(`Unexpected message type: ${msg.data.message.__type_url}`);
        }
      }
    });

    await waitForExpect(() => expect(messages).toEqual([
      { data: testMessage(1) },
      { data: testMessage(3) }
    ]));

    streams[0].write(testAdmit(descriptors[1].key));

    await waitForExpect(() => expect(messages).toEqual([
      { data: testMessage(1) },
      { data: testMessage(3) },
      { data: testAdmit(descriptors[1].key) },
      { data: testMessage(2) }
    ]));

    streams[1].write(testRemove(descriptors[0].key));
    await waitForExpect(() => expect(messages.length).toEqual(5));
    streams[0].write(testMessage(4));
    streams[1].write(testMessage(5));

    await waitForExpect(() => expect(messages).toEqual([
      { data: testMessage(1) },
      { data: testMessage(3) },
      { data: testAdmit(descriptors[1].key) },
      { data: testMessage(2) },
      { data: testRemove(descriptors[0].key) },
      { data: testMessage(5) }
    ]));
  });

  test('feed added while iterating', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    const iterator = await FeedStoreIterator.create(feedStore, async () => true);

    const feed = await feedStore.openFeed('feed');
    const stream = createWritableFeedStream(feed);

    const messages: any[] = [];
    setImmediate(async () => {
      for await (const msg of iterator) {
        messages.push(msg);
      }
    });

    stream.write(testMessage(1));
    stream.write(testMessage(2));
    stream.write(testMessage(3));

    await waitForExpect(() => expect(messages).toEqual([
      { data: testMessage(1) },
      { data: testMessage(2) },
      { data: testMessage(3) }
    ]));
  });
});
