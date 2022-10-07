//
// Copyright 2022 DXOS.org
//

import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { Timeframe } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';
import { range } from '@dxos/util';

import { codec } from '../common';
import { Pipeline } from './pipeline';

describe('pipeline/Pipeline', function () {
  it('asynchronous reader & writer without ordering', async function () {
    const pipeline = new Pipeline(new Timeframe());
    afterTest(() => pipeline.stop());

    const keyring = new Keyring();
    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });

    // Remote feeds from other peers.
    const numFeeds = 5; const messagesPerFeed = 10;
    for (const feedIdx in range(numFeeds)) {
      const feed = await feedStore.openReadWriteFeedWithSigner(await keyring.createKey(), keyring);

      pipeline.addFeed(feed);

      setTimeout(async () => {
        for (const msgIdx in range(messagesPerFeed)) {
          const msg: FeedMessage = {
            timeframe: new Timeframe(),
            payload: {
              '@type': 'dxos.echo.feed.EchoEnvelope',
              itemId: `${feedIdx}-${msgIdx}`
            }
          };
          await feed.append(msg);
        }
      });
    }

    // Local feed.
    const localFeed = await feedStore.openReadWriteFeedWithSigner(await keyring.createKey(), keyring);
    pipeline.addFeed(localFeed);
    pipeline.setWriteFeed(localFeed);
    for (const msgIdx in range(messagesPerFeed)) {
      await pipeline.writer!.write({
        '@type': 'dxos.echo.feed.EchoEnvelope',
        itemId: `local-${msgIdx}`
      });
    }

    let msgCount = 0;
    for await (const _ of pipeline.consume()) {
      if (++msgCount === numFeeds * messagesPerFeed) {
        void pipeline.stop();
      }
    }
  });
});
