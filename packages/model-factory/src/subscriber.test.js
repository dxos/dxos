//
// Copyright 2020 DXOS.org
//

import eos from 'end-of-stream';

import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';
import { FeedStore } from '@dxos/feed-store';
import { createId } from '@dxos/crypto';

import { Subscriber } from './subscriber';

const wait = (callback, n) => () => (--n === 0) && callback();

const createSubscriber = async (path, topic) => {
  const feedStore = new FeedStore(createStorage('./temp', STORAGE_RAM), { feedOptions: { valueEncoding: 'json' } });
  await feedStore.open();

  const subscriber = new Subscriber(feedStore);

  const feed = await feedStore.openFeed(path, { metadata: { topic } });

  return { subscriber, feed, feedStore };
};

describe('Subscriber', () => {
  test('Filtered streams', async (done) => {
    const types = [
      'testing.Event',
      'testing.Task'
    ];

    const root = '/test';
    const topic = 'test-topic';

    const { subscriber, feed } = await createSubscriber(root, topic);

    // TODO(burdon): Convert to latch.
    const n = types.length * 10;
    const count = wait(done, 2 * (n / types.length));

    const filter = {
      __type_url: types[0]
    };

    // Test created before.
    subscriber.createSubscription(topic, filter).stream.on('data', count);

    for (let i = 0; i < n; i++) {
      feed.append({
        id: createId(),
        __type_url: types[(i % types.length)]
      });
    }

    // Test created after.
    subscriber.createSubscription(topic, filter).stream.on('data', count);
  });

  test('Filtered streams (array filter)', async (done) => {
    const types = [
      'testing.Event1',
      'testing.Event2'
    ];

    const root = '/test';
    const topic = 'test-topic';

    const { subscriber, feed } = await createSubscriber(root, topic);

    const n = types.length * 10;

    const filter = {
      __type_url: types
    };

    subscriber.createSubscription(topic, filter).stream.on('data', wait(done, n));

    for (let i = 0; i < n; i++) {
      feed.append({
        id: createId(),
        __type_url: types[(i % types.length)]
      });
    }
  });

  test('Filtered streams (regex filter)', async (done) => {
    const types = [
      'testing.event.Event1',
      'testing.event.Event2'
    ];

    const root = '/test';
    const topic = 'test-topic';

    const { subscriber, feed } = await createSubscriber(root, topic);

    const n = types.length * 10;

    const filter = {
      __type_url: /^testing\.event\.\w+$/
    };

    subscriber.createSubscription(topic, filter).stream.on('data', wait(done, n));

    for (let i = 0; i < n; i++) {
      feed.append({
        id: createId(),
        __type_url: types[(i % types.length)]
      });
    }
  });

  test('Multiple streams', async (done) => {
    const types = [
      'testing.Event',
      'testing.Task'
    ];

    const root = '/test';
    const topic = 'test-topic';

    const { subscriber, feed } = await createSubscriber(root, topic);

    const n = types.length * 10;
    const count = wait(done, 2 * (n / types.length));

    const filters = types.map(type => ({ __type_url: type }));

    // Test created before.
    filters.forEach(filter => {
      subscriber.createSubscription(topic, filter).stream.on('data', count);
    });

    for (let i = 0; i < n; i++) {
      feed.append({
        id: createId(),
        __type_url: types[(i % types.length)]
      });
    }
  });

  test('Should close subscriptions on destroy', async () => {
    const path = '/test';
    const topic = 'test-topic';

    const { subscriber, feedStore } = await createSubscriber(path, topic);

    const subscriptions = [];
    subscriptions.push(subscriber.createSubscription(topic).stream.on('data', () => {}));
    subscriptions.push(subscriber.createSubscription(topic).stream.on('data', () => {}));

    const end = Promise.all(subscriptions.map(sub => new Promise(resolve => eos(sub, resolve))));
    feedStore.close();
    await end;
  });
});
