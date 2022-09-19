//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import {
  createFeedWriter, FeedBlock, FeedStoreIterator, FeedWriter, mapFeedWriter, TypedMessage
} from '@dxos/echo-protocol';
import { FeedDescriptor } from '@dxos/feed-store';
import { log } from '@dxos/log';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { ComplexMap } from '@dxos/util';

import { createMessageSelector } from './message-selector';
import { TimeframeClock } from './timeframe-clock';

const STALL_TIMEOUT = 1000;

const createFeedWriterWithTimeframe = (feed: FeedDescriptor, getTimeframe: () => Timeframe): FeedWriter<TypedMessage> => {
  const writer = createFeedWriter<FeedMessage>(feed);
  return mapFeedWriter(payload => ({
    payload,
    timeframe: getTimeframe()
  }), writer);
};

export type PipelineState = {
  readonly timeframeUpdate: Event<Timeframe>
  readonly timeframe: Timeframe
  readonly endTimeframe: Timeframe

  waitUntilReached: (target: Timeframe) => Promise<void>
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
  private readonly _feeds = new ComplexMap<PublicKey, FeedDescriptor>(key => key.toHex());
  private readonly _iterator = new FeedStoreIterator(
    () => true,
    createMessageSelector(this._timeframeClock),
    this._initialTimeframe
  );

  private readonly _state: PipelineState;

  private _writer: FeedWriter<TypedMessage> | undefined;
  private _isOpen = false;

  constructor (
    private readonly _initialTimeframe: Timeframe
  ) {
    this._iterator.stalled.on(candidates => {
      log.warn(`Feed store reader stalled: no message candidates were accepted after ${STALL_TIMEOUT}ms timeout.\nCurrent candidates:`, candidates);
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this._state = {
      get timeframe () {
        return self._timeframeClock.timeframe;
      },
      get endTimeframe () {
        return self._iterator.getEndTimeframe();
      },
      timeframeUpdate: this._timeframeClock.update,
      waitUntilReached: async (target) => {
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

  setWriteFeed (feed: FeedDescriptor) {
    assert(!this._writer, 'Writer already set.');
    this._writer = createFeedWriterWithTimeframe(feed, () => this._timeframeClock.timeframe);
  }

  addFeed (feed: FeedDescriptor) {
    assert(!this._feeds.has(feed.key), 'Feed already added.');
    this._feeds.set(feed.key, feed);
    this._iterator.addFeedDescriptor(feed);
  }

  /**
   * Starts to iterate over the ordered messages from the added feeds.
   * Updates the timeframe clock after the message has bee processed.
   */
  async * consume (): AsyncIterable<FeedBlock> {
    assert(!this._isOpen, 'Pipeline is already being consumed.');
    this._isOpen = true;

    for await (const block of this._iterator) {
      yield block;
      this._timeframeClock.updateTimeframe(PublicKey.from(block.key), block.seq);
    }

    // TODO(burdon): Test re-entrant?
    this._isOpen = false;
  }

  async stop () {
    await this._iterator.close();
  }
}
