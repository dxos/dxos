//
// Copyright 2022 DXOS.org
//

import { TestBuilder } from '@dxos/feed-store';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { afterTest } from '@dxos/testutils';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { Pipeline } from './pipeline';

describe('pipeline/Pipeline', function () {
  it('asynchronous reader & writer without ordering', async function () {
    const pipeline = new Pipeline(new Timeframe());
    afterTest(() => pipeline.stop());

    const builder = new TestBuilder();
    const feedStore = builder.createFeedStore();

    // Remote feeds from other peers.
    const numFeeds = 5; const messagesPerFeed = 10;
    for (const feedIdx in range(numFeeds)) {
      const key = await builder.keyring.createKey();
      const feed = await feedStore.openFeed(key, { writable: true });
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
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });
    pipeline.addFeed(feed);
    pipeline.setWriteFeed(feed);

    for (const msgIdx in range(messagesPerFeed)) {
      await pipeline.writer!.append({
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
