//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { createFeedWriter, FeedBlock, FeedMessage, FeedStoreIterator, FeedWriter } from '@dxos/echo-protocol';
import { FeedDescriptor } from '@dxos/feed-store';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

import { TimeframeClock } from '../database';
import { createMessageSelector } from './message-selector';

const STALL_TIMEOUT = 1000;

const log = debug('dxos:echo-db:pipeline');
const warn = debug('dxos:echo-db:pipeline:warn');

/**
 * A multi-reader pipeline that operates on feeds.
 * Might have a single writable feed.
 * Has a timeframe clock to handle message ordering.
 *
 * NOTE:
 *  - Feeds passed in must have value encoding consistent with the type expected by the iterator/writer.
 *
 * # Usage examples
 *
 * ## Create a new space.
 *
 * 1. Generate space key, genesis feed key.
 * 2. Create and open pipeline reading from {}.
 * 3. Create and add the writable genesis feed.
 * 4. Write the initial sequence of control and credential messages.
 *
 * ## Load an existing space from storage
 *
 * 1. Load space key, genesis feed key, get starting timeframe from saved snapshot.
 * 2. Create and open pipeline reading from the initial timeframe.
 * 3. Open and add the genesis feed.
 * 4. Once the writable feed is added, the pipeline becomes writable.
 *
 * ## Join an existing space created by another agent/device.
 *
 * 1. Get the space key, genesis feed key from another agent.
 * 2. (optionally) Download the snapshot from another agent.
 * 3. Create and open pipeline.
 * 4. Generate the writable feed key.
 * 5. Wait for the writable feed to be added.
 */
export class Pipeline {
  private readonly _timeframeClock = new TimeframeClock(this._initialTimeframe);

  private readonly _feeds = new ComplexMap<PublicKey, FeedDescriptor>(key => key.toHex());
  private _writableFeed: FeedDescriptor | undefined = undefined;
  private _feedWriter: FeedWriter<Omit<FeedMessage, 'timeframe'>> | undefined = undefined;

  private _iterator = new FeedStoreIterator(
    () => true,
    createMessageSelector(this._timeframeClock),
    this._initialTimeframe
  );

  constructor (
    private readonly _initialTimeframe: Timeframe
  ) {
    this._iterator.stalled.on(candidates => {
      warn(`Feed store reader stalled: no message candidates were accepted after ${STALL_TIMEOUT}ms timeout.\nCurrent candidates:`, candidates);
    });
  }

  get iterator (): AsyncIterable<FeedBlock> {
    return this._iterator;
  }

  get writer (): FeedWriter<Omit<FeedMessage, 'timeframe'>> | undefined {
    return this._feedWriter;
  }

  addFeed (feed: FeedDescriptor) {
    assert(!this._feeds.has(feed.key), 'Feed already added.');
    this._feeds.set(feed.key, feed);

    if (feed.writable) {
      this._writableFeed = feed;
      this._feedWriter = createFeedWriter(this._writableFeed.feed);
    }

    this._iterator.addFeedDescriptor(feed);
  }

  stop () {
    this._iterator.close();
  }
}
