//
// Copyright 2021 DXOS.org
//

// @dxos/mocha platform=browser

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { createStorage } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';

import { codec } from '../common';

describe('replication', function () {
  it('replicates a feed through a direct stream', async function () {
    // Some storage drivers may break when there are multiple storage instances.
    const storage = createStorage();

    // Creates an appropriate persistent storage for the browser: IDB in Chrome or File storage in Firefox.
    const keyring1 = new Keyring();
    const feedStore1 = new FeedStore({
      factory: new FeedFactory({
        root: storage.createDirectory('feeds1'),
        signer: keyring1,
        hypercore: { valueEncoding: codec }
      })
    });

    const keyring2 = new Keyring();
    const feedStore2 = new FeedStore({
      factory: new FeedFactory({
        root: storage.createDirectory('feeds2'),
        signer: keyring2,
        hypercore: { valueEncoding: codec }
      })
    });

    const feed1 = await feedStore1.openFeed(await keyring1.createKey(), { writable: true });
    const feed2 = await feedStore2.openFeed(feed1.key);

    const stream1 = feed1.replicate(true);
    const stream2 = feed2.replicate(false);
    stream1.pipe(stream2).pipe(stream1);

    await feed1.append({
      timeframe: new Timeframe([[feed1.key, 123]])
    });

    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(1);
    });
  });
});
