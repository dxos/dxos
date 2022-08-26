//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createKeyPair } from '@dxos/crypto';
import { codec, FeedMessage } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';
import { range } from '@dxos/util';

import { Pipeline } from './pipeline';

describe('pipeline/Pipeline', () => {
  test('asynchronous reader & writer without ordering', async () => {
    const pipeline = new Pipeline(new Timeframe());

    const feedStore = new FeedStore(createStorage('', StorageType.RAM).directory(), { valueEncoding: codec });

    // Remote feeds from other peers.
    const numFeeds = 5; const messagesPerFeed = 10;
    for (const feedIdx in range(numFeeds)) {
      // Simulate replicating a remote feed.
      const { publicKey, secretKey } = createKeyPair();
      const remoteFeed = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
      const localFeed = await feedStore.openReadOnlyFeed(PublicKey.from(publicKey));
      pump(localFeed.feed.replicate(false), remoteFeed.feed.replicate(true));

      pipeline.addFeed(localFeed);

      setTimeout(async () => {
        for (const msgIdx in range(messagesPerFeed)) {
          const msg: FeedMessage = {
            timeframe: new Timeframe(),
            echo: {
              itemId: `${feedIdx}-${msgIdx}`
            }
          };
          await remoteFeed.append(msg);
        }
      });
    }

    // Your own writable feed.
    {
      const { publicKey, secretKey } = createKeyPair();
      const feed = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
      pipeline.addFeed(feed);
      expect(pipeline.writer).toBeDefined();

      for (const msgIdx in range(messagesPerFeed)) {
        await pipeline.writer!.write({
          echo: {
            itemId: `own-${msgIdx}`
          }
        });
      }
    }

    let msgCount = 0;
    for await (const msg of pipeline.iterator) {
      if (++msgCount === (numFeeds + 1) * messagesPerFeed) {
        pipeline.stop();
      }
    }
  });
});

const pump = (a: NodeJS.ReadWriteStream, b: NodeJS.ReadWriteStream) => a.pipe(b).pipe(a);
