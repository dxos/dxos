//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { FeedSetIterator, FeedWrapper, FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedMessageBlock, TypedMessage } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

import { createMappedFeedWriter } from '../common';
import { createMessageSelector } from './message-selector';
import { mapFeedIndexesToTimeframe, mapTimeframeToFeedIndexes, TimeframeClock } from './timeframe-clock';

/**
 * External state accessor.
 */
export class PipelineState {
  public readonly timeframeUpdate = this._timeframeClock.updateTimeframe;

  constructor (
    private _iterator: FeedSetIterator<any>,
    private _timeframeClock: TimeframeClock
  ) {}

  // TODO(burdon): For testing only.
  get endTimeframe () {
    return mapFeedIndexesToTimeframe(this._iterator.end);
  }

  get timeframe () {
    return this._timeframeClock.timeframe;
  }

  async waitUntilTimeframe (target: Timeframe) {
    await this._timeframeClock.waitUntilReached(target);
  }
}

export interface PipelineAccessor {
  state: PipelineState
  writer: FeedWriter<TypedMessage>
}

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
export class Pipeline implements PipelineAccessor {
  private readonly _timeframeClock = new TimeframeClock(this._initialTimeframe);

  // Inbound feed stream.
  private readonly feedSetIterator = new FeedSetIterator<FeedMessage>(createMessageSelector(this._timeframeClock), {
    start: mapTimeframeToFeedIndexes(this._initialTimeframe),
    stallTimeout: 1000
  });

  // External state accessor.
  private readonly _state: PipelineState = new PipelineState(this.feedSetIterator, this._timeframeClock);

  // Outbound feed writer.
  private _writer: FeedWriter<TypedMessage> | undefined;

  private _isOpen = false;

  constructor (
    private readonly _initialTimeframe: Timeframe
  ) {
    this.feedSetIterator.stalled.on((iterator) => {
      log.warn(`Stalled after ${iterator.options.stallTimeout}ms with ${iterator.size} feeds.`);
    });
  }

  get state () {
    return this._state;
  }

  get writer (): FeedWriter<TypedMessage> {
    assert(this._writer, 'Writer not set.');
    return this._writer;
  }

  async addFeed (feed: FeedWrapper<FeedMessage>) {
    await this.feedSetIterator.addFeed(feed);
  }

  setWriteFeed (feed: FeedWrapper<FeedMessage>) {
    assert(!this._writer, 'Writer already set.');
    assert(feed.properties.writable, 'Feed must be writable.');

    this._writer = createMappedFeedWriter<TypedMessage, FeedMessage>((data: TypedMessage) => ({
      timeframe: this._timeframeClock.timeframe,
      payload: data
    }), feed.createFeedWriter());
  }

  async start () {
    await this.feedSetIterator.open();
  }

  async stop () {
    await this.feedSetIterator.close();
  }

  /**
   * Starts to iterate over the ordered messages from the added feeds.
   * Updates the timeframe clock after the message has bee processed.
   */
  async * consume (): AsyncIterable<FeedMessageBlock> {
    assert(!this._isOpen, 'Pipeline is already being consumed.');
    this._isOpen = true;

    for await (const block of this.feedSetIterator) {
      yield block;

      this._timeframeClock.updateTimeframe(PublicKey.from(block.feedKey), block.seq);
    }

    // TODO(burdon): Test re-entrant?
    this._isOpen = false;
  }
}
