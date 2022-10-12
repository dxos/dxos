//
// Copyright 2021 DXOS.org
//

// @dxos/mocha platform=browser

import expect from 'expect';
import { ProtocolStream } from 'hypercore-protocol';
import waitForExpect from 'wait-for-expect';

import { FeedDescriptor, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { Timeframe } from '@dxos/protocols';
import { createStorage } from '@dxos/random-access-storage';

import { codec } from '../common';

describe('replication', function () {
  it('replicates a feed through a direct stream', async function () {
    // Some storage drivers may break when there are multiple storage instances.
    const storage = createStorage();

    // Creates an appropriate persistent storage for the browser: IDB in Chrome or File storage in Firefox.
    const feedStore1 = new FeedStore(storage.createDirectory('feeds1'), { valueEncoding: codec });
    const feedStore2 = new FeedStore(storage.createDirectory('feeds2'), { valueEncoding: codec });

    const keyring = new Keyring();

    const feed1: FeedDescriptor = await feedStore1.openReadWriteFeedWithSigner(await keyring.createKey(), keyring);
    const feed2: FeedDescriptor = await feedStore2.openReadOnlyFeed(feed1.key);

    const stream1: ProtocolStream = feed1.replicate(true);
    const stream2: ProtocolStream = feed2.replicate(false);
    stream1.pipe(stream2).pipe(stream1);

    await feed1.append({
      timeframe: new Timeframe([[feed1.key, 123]])
    });

    await waitForExpect(() => {
      expect(feed2.length).toEqual(1);
    });
  });
});
