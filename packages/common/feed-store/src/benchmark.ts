//
// Copyright 2019 DXOS.org
//

import { Suite } from '@dxos/benchmark-suite';
import { createKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createStorage } from '@dxos/random-access-storage';

import { FeedStore } from './feed-store';

const range = (n: number) => [...Array(n).keys()];

void (async () => {
  const maxFeeds = 5;
  const maxMessages = 1000;
  const expectedMessages = maxFeeds * maxMessages;

  const check = (count: number) => {
    if (count !== expectedMessages) {
      throw new Error('messages amount expected incorrect');
    }
  };

  const feedStore = new FeedStore(createStorage().createDirectory('.benchmark'), { valueEncoding: 'utf-8' });
  const suite = new Suite(feedStore, { maxFeeds, maxMessages });

  suite.beforeAll(() => Promise.all(range(maxFeeds).map(async i => {
    const name = `feed/${i}`;
    const { publicKey, secretKey } = createKeyPair();
    const { feed } = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);

    // TODO(burdon): Can we use a plain for loop for await?
    for (let i = 0; i < maxMessages; i++) {
      await feed.append(`${name}/${i}`);
    }

    return feed;
  })));

  suite.test('getBatch', async () => {
    let count = 0;

    await Promise.all(Array.from((feedStore as any)._descriptors.values()).map(({ feed }: any) => new Promise<void>((resolve, reject) => {
      feed.getBatch(0, maxMessages, (err: Error, result: any) => {
        count += result.length;
        if (err) {
          return reject(err);
        }
        resolve();
      });
    })));

    check(count);
  });
  const results = await suite.run();

  suite.print(results);
})();
