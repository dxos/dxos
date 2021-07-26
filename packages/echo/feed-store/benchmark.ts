//
// Copyright 2019 DXOS.org
//

import { createStorage } from '@dxos/random-access-multi-storage';
import { Suite } from '@dxos/benchmark-suite';
import process from 'process'

import { FeedStore } from './src';

const range = n => [...Array(n).keys()];

(async () => {
  const maxFeeds = 5;
  const maxMessages = 1000;
  const expectedMessages = maxFeeds * maxMessages;

  const check = count => {
    if (count !== expectedMessages) {
      throw new Error('messages amount expected incorrect');
    }
  };

  const fs = new FeedStore(createStorage('.benchmark'), { feedOptions: { valueEncoding: 'utf8' } });
  await fs.open();
  const suite = new Suite(fs, { maxFeeds, maxMessages });

  suite.beforeAll(() => {
    return Promise.all(range(maxFeeds).map(async i => {
      const name = `feed/${i}`;
      const feed = await fs.openFeed(name);

      for (let i = 0; i < maxMessages; i++) {
        await new Promise<void>((resolve, reject) => {
          feed.append(`${name}/${i}`, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }

      return feed;
    }));
  });

  suite.test('getBatch', async () => {
    let count = 0;

    await Promise.all(fs.getOpenFeeds().map(feed => {
      return new Promise<void>((resolve, reject) => {
        feed.getBatch(0, maxMessages, (err, result) => {
          count += result.length;
          if (err) return reject(err);
          resolve();
        });
      });
    }));

    check(count);
  });

  suite.test('createReadStream [batch=1]', async () => {
    const stream = fs.createReadStream({ batch: 1 });
    let count = 0;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (data) => {
        count++;
        if (count === expectedMessages) resolve();
      });
    });

    stream.destroy();

    check(count);
  });

  suite.test('createReadStream [batch=100]', async () => {
    const stream = fs.createReadStream({ batch: 100 });
    let count = 0;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (data) => {
        count++;
        if (count === expectedMessages) resolve();
      });
    });

    stream.destroy();

    check(count);
  });

  suite.test('createBatchStream [batch=100]', async () => {
    const stream = fs.createBatchStream({ batch: 100 });
    let count = 0;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (data) => {
        count += data.length;
        if (count === expectedMessages) resolve();
      });
    });

    stream.destroy();

    check(count);
  });

  const results = await suite.run();

  suite.print(results);

  process.exit(0);
})();