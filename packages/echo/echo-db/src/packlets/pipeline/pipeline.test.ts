//
// Copyright 2022 DXOS.org
//

import { it as test } from 'mocha';

import { createKeyPair } from '@dxos/crypto';
import { codec, FeedMessage } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';
import { afterTest } from '@dxos/testutils';
import { range } from '@dxos/util';

import { Pipeline } from './pipeline';

describe('pipeline/Pipeline', () => {
  test('asynchronous reader & writer without ordering', async () => {
    const pipeline = new Pipeline(new Timeframe());
    afterTest(() => pipeline.stop());

    const feedStore = new FeedStore(createStorage('', StorageType.RAM).directory(), { valueEncoding: codec });

    // Remote feeds from other peers.
    const numFeeds = 5; const messagesPerFeed = 10;
    for (const feedIdx in range(numFeeds)) {
      const { publicKey, secretKey } = createKeyPair();
      const feed = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);

      pipeline.addFeed(feed);

      setTimeout(async () => {
        for (const msgIdx in range(messagesPerFeed)) {
          const msg: FeedMessage = {
            timeframe: new Timeframe(),
            echo: {
              itemId: `${feedIdx}-${msgIdx}`
            }
          };
          await feed.append(msg);
        }
      });
    }

    // Local feed.
    const { publicKey, secretKey } = createKeyPair();
    const localFeed = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    pipeline.addFeed(localFeed);
    pipeline.setWriteFeed(localFeed);
    for (const msgIdx in range(messagesPerFeed)) {
      await pipeline.writer!.write({
        echo: {
          itemId: `local-${msgIdx}`
        }
      });
    }

    let msgCount = 0;
    for await (const msg of pipeline.consume()) {
      if (++msgCount === numFeeds * messagesPerFeed) {
        pipeline.stop();
      }
    }
  });
});

const pump = (a: NodeJS.ReadWriteStream, b: NodeJS.ReadWriteStream) => a.pipe(b).pipe(a);
