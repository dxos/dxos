//
// Copyright 2021 DXOS.org
//

// @dxos/mocha platform=browser

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { createStorage } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';

import { codec } from '../common';

describe('replication', function () {
  it('replicates a feed through a direct stream', async function () {
    // Some storage drivers may break when there are multiple storage instances.
    const storage = createStorage();

    // Creates an appropriate persistent storage for the browser: IDB in Chrome or File storage in Firefox.
    const feedStore1 = new FeedStore(storage.createDirectory('feeds1'), { valueEncoding: codec });
    const feedStore2 = new FeedStore(storage.createDirectory('feeds2'), { valueEncoding: codec });

    const keyring = new Keyring();

    const srcFeed = await feedStore1.openReadWriteFeedWithSigner(await keyring.createKey(), keyring);
    const dstFeed = await feedStore2.openReadOnlyFeed(srcFeed.key);

    const stream1 = srcFeed.feed.replicate(true);
    const stream2 = dstFeed.feed.replicate(false);
    stream1.pipe(stream2).pipe(stream1);

    await srcFeed.append({
      timeframe: new Timeframe([[srcFeed.key, 123]])
    });

    await waitForExpect(() => {
      expect(dstFeed.feed.length).toEqual(1);
    });
  });
});
