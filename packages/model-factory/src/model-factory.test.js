//
// Copyright 2020 DXOS.org
//

import bufferJson from 'buffer-json-encoding';
import pify from 'pify';

import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';
import { latch } from '@dxos/async';
import { createId, randomBytes } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { DefaultModel } from './model';
import { ModelFactory } from './model-factory';

const sleep = ms => {
  let cancel;
  const promise = new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    cancel = err => {
      clearTimeout(timeout);
      reject(err);
    };
  });

  return { promise, cancel };
};

const randomInt = (min, max) => Math.floor(Math.random() * max) + min;

const createFactory = async () => {
  const feedStore = await FeedStore.create(createStorage('./temp', STORAGE_RAM), {
    feedOptions: {
      valueEncoding: 'buffer-json'
    },
    codecs: {
      'buffer-json': bufferJson
    }
  });

  const topic = randomBytes(32);

  const feed = await feedStore.openFeed('/writable', { metadata: { topic } });

  return {
    factory: new ModelFactory(feedStore, {
      onAppend (message) {
        return pify(feed.append.bind(feed))(message);
      }
    }),
    topic
  };
};

describe('Model factory', () => {
  test('Sync data via two models', async (done) => {
    const { factory, topic } = await createFactory();

    const options = { type: 'test.Type', topic };

    // TODO(burdon): Create array of models.
    const model1 = await factory.createModel(DefaultModel, options);
    expect(model1.id).toBeDefined();

    const model2 = await factory.createModel(DefaultModel, options);
    expect(model2.id).toBeDefined();

    // TODO(burdon): Test pushing messages after destroyed (race conditions).
    const cleanup = () => {
      factory.destroyModel(model1);
      expect(model1.destroyed).toBe(true);

      factory.destroyModel(model2);
      expect(model2.destroyed).toBe(true);

      done();
    };

    // TODO(burdon): Use @dxos/crypto
    const messages = [
      { __type_url: 'test.Type', id: createId() },
      { __type_url: 'test.Type', id: createId() },
      { __type_url: 'test.Type', id: createId() },
      { __type_url: 'test.Type', id: createId() },
      { __type_url: 'test.Type', id: createId() }
    ];

    const counter = latch(2, cleanup);

    model1.on('update', () => {
      if (model1.messages.length === messages.length) {
        counter();
      }
    });

    model2.on('update', () => {
      if (model2.messages.length === messages.length) {
        counter();
      }
    });

    // TODO(burdon): Option to swtich off buffering.
    // Alternate posting to either model.
    for (let i = 0; i < messages.length; i++) {
      await ((i % 2 === 0) ? model1 : model2).appendMessage(messages[i]);
    }
  });

  test('Model from multiple types (array filter)', async (done) => {
    const { factory, topic } = await createFactory();

    const options = { type: ['test.Type1', 'test.Type2'], topic };

    const model = await factory.createModel(DefaultModel, options);
    expect(model.id).toBeDefined();

    const messages = [
      { __type_url: 'test.Type1', id: createId() },
      { __type_url: 'test.Type2', id: createId() },
      { __type_url: 'test.Type1', id: createId() },
      { __type_url: 'test.Type2', id: createId() },
      { __type_url: 'test.Type1', id: createId() }
    ];

    model.on('update', () => {
      if (model.messages.length === messages.length) {
        done();
      }
    });

    for (let i = 0; i < messages.length; i++) {
      await model.appendMessage(messages[i]);
    }
  });

  test('Model from multiple types (regex filter)', async (done) => {
    const { factory, topic } = await createFactory();

    const options = { type: /test\.\w+/, topic };

    const model = await factory.createModel(DefaultModel, options);
    expect(model.id).toBeDefined();

    const messages = [
      { __type_url: 'test.Type1', id: createId() },
      { __type_url: 'test.Type2', id: createId() },
      { __type_url: 'test.Type1', id: createId() },
      { __type_url: 'test.Type2', id: createId() },
      { __type_url: 'test.Type1', id: createId() }
    ];

    model.on('update', () => {
      if (model.messages.length === messages.length) {
        done();
      }
    });

    for (let i = 0; i < messages.length; i++) {
      await model.appendMessage(messages[i]);
    }
  });

  test('Check processing order of model messages', async () => {
    class SlowModel extends DefaultModel {
      async onUpdate (messages) {
        for (const m of messages) {
          // Simulate calling async functions to process messages.
          this._currentProcess = sleep(randomInt(0, 100));
          await this._currentProcess.promise;

          // Record order of message processing.
          this._messages.push(m.value);
        }
      }

      async onDestroy () {
        this._currentProcess && this._currentProcess.cancel();
      }
    }

    const { factory, topic } = await createFactory();
    const model = await factory.createModel(SlowModel, { type: 'test.Type', topic });

    // Write in a steady flow of messages.
    const n = 20;
    const waitForMessages = new Promise(resolve => model.on('update', () => {
      if (model.messages.length === n) {
        resolve();
      }
    }));
    for (let i = 0; i < n; i++) {
      await model.appendMessage({ __type_url: 'test.Type', value: i });
    }

    await waitForMessages;

    const sortedMessages = [...model.messages];
    sortedMessages.sort((a, b) => a - b);
    expect(sortedMessages).toEqual(model.messages);

    await model.destroy();
  });
});
