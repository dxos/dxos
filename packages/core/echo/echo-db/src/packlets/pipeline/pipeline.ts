//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { createFeedWriter, FeedSetIterator, FeedWrapper, FeedWriter, createMappedFeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedMessageBlock, TypedMessage } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';
import { ComplexMap } from '@dxos/util';

import { createMessageSelector } from './message-selector';
import { mapFeedIndexesToTimeframe, mapTimeframeToFeedIndexes, TimeframeClock } from './timeframe-clock';

// TODO(burdon): Create class abstraction for Timeframe related state.
export type PipelineState = {
  readonly timeframeUpdate: Event<Timeframe>

  readonly timeframe: Timeframe
  readonly endTimeframe: Timeframe

  waitUntilTimeframe: (target: Timeframe) => Promise<void>
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

  // TODO(burdon): Not used?
  private readonly _feeds = new ComplexMap<PublicKey, FeedWrapper<FeedMessage>>(PublicKey.hash);

  private readonly _iterator = new FeedSetIterator(createMessageSelector(this._timeframeClock), {
    start: mapTimeframeToFeedIndexes(this._initialTimeframe),
    timeout: 5000
  });

  private readonly _state: PipelineState;

  private _writer: FeedWriter<TypedMessage> | undefined;

  private _isOpen = false;

  constructor (
    private readonly _initialTimeframe: Timeframe
  ) {
    this._iterator.stalled.on((iterator) => {
      log.warn(`Stalled after ${iterator.options.timeout}ms with ${iterator.size} feeds.`);
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this; // TODO(burdon): Create class or closure.
    this._state = {
      timeframeUpdate: self._timeframeClock.update,

      get timeframe () {
        return self._timeframeClock.timeframe;
      },

      get endTimeframe () {
        return mapFeedIndexesToTimeframe(self._iterator.indexes);
      },

      waitUntilTimeframe: async (target) => {
        await self._timeframeClock.waitUntilReached(target);
      }
    };
  }

  get state () {
    return this._state;
  }

  get writer (): FeedWriter<TypedMessage> {
    assert(this._writer, 'Writer not set.');
    return this._writer;
  }

  async addFeed (feed: FeedWrapper<FeedMessage>) {
    assert(!this._feeds.has(feed.key), 'Feed already added.');

    this._feeds.set(feed.key, feed);
    await this._iterator.addFeed(feed);
  }

  setWriteFeed (feed: FeedWrapper<FeedMessage>) {
    assert(!this._writer, 'Writer already set.');
    assert(feed.properties.writable, 'Feed must be writable.');

    const writer = createFeedWriter<FeedMessage>(feed);
    this._writer = createMappedFeedWriter<TypedMessage, FeedMessage>((data: TypedMessage) => ({
      timeframe: this._timeframeClock.timeframe,
      payload: data
    }), writer);
  }

  async start () {
    await this._iterator.start();
  }

  async stop () {
    await this._iterator.close();
  }

  /**
   * Starts to iterate over the ordered messages from the added feeds.
   * Updates the timeframe clock after the message has bee processed.
   */
  async * consume (): AsyncIterable<FeedMessageBlock> {
    assert(!this._isOpen, 'Pipeline is already being consumed.');
    this._isOpen = true;

    for await (const block of this._iterator) {
      yield block;

      this._timeframeClock.updateTimeframe(PublicKey.from(block.key), block.seq);
    }

    // TODO(burdon): Test re-entrant?
    this._isOpen = false;
  }
}
