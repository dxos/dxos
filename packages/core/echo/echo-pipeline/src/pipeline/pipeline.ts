//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { sleep, Trigger } from '@dxos/async';
import { FeedSetIterator, FeedWrapper, FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedMessageBlock } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

import { createMappedFeedWriter } from '@dxos/echo-db';
import { createMessageSelector } from './message-selector';
import { mapFeedIndexesToTimeframe, mapTimeframeToFeedIndexes, TimeframeClock } from './timeframe-clock';

export type WaitUntilReachedTargetParams = {
  timeout?: number;
};

/**
 * External state accessor.
 */
export class PipelineState {
  // TODO(dmaretskyi): Remove?.
  public readonly timeframeUpdate = this._timeframeClock.update;

  /**
   * Target timeframe we are waiting to reach.
   */
  private _targetTimeframe: Timeframe | undefined;

  private _reachedTargetPromise: Promise<void> | undefined;

  // prettier-ignore
  constructor(
    private _iterator: FeedSetIterator<any>,
    private _timeframeClock: TimeframeClock
  ) { }

  /**
   * Latest theoretical timeframe based on the last mutation in each feed.
   * NOTE: This might never be reached if the mutation dependencies
   */
  get endTimeframe() {
    return mapFeedIndexesToTimeframe(
      this._iterator.feeds
        .filter((feed) => feed.properties.length > 0)
        .map((feed) => ({
          feedKey: feed.key,
          index: feed.properties.length - 1
        }))
    );
  }

  get timeframe() {
    return this._timeframeClock.timeframe;
  }

  get targetTimeframe() {
    return this._targetTimeframe ? Timeframe.merge(this.endTimeframe, this._targetTimeframe) : this.endTimeframe;
  }

  async waitUntilTimeframe(target: Timeframe) {
    await this._timeframeClock.waitUntilReached(target);
  }

  setTargetTimeframe(target: Timeframe) {
    this._targetTimeframe = target;
  }

  /**
   * Wait until the pipeline processes all messages in the feed and reaches the target timeframe if that is set.
   *
   * This function will resolve immediately if the pipeline is stalled.
   *
   * @param timeout Timeout in milliseconds to specify the maximum wait time.
   */
  async waitUntilReachedTargetTimeframe({ timeout }: WaitUntilReachedTargetParams = {}) {
    log('waitUntilReachedTargetTimeframe', {
      timeout,
      current: this.timeframe,
      target: this.targetTimeframe
    });

    this._reachedTargetPromise ??= Promise.race([
      this._timeframeClock.update.waitForCondition(() => {
        return Timeframe.dependencies(this.targetTimeframe, this.timeframe).isEmpty();
      }),
      this._iterator.stalled.discardParameter().waitForCount(1)
    ]);

    let done = false;

    if (timeout) {
      return Promise.race([
        this._reachedTargetPromise.then(() => {
          done = true;
        }),
        sleep(timeout).then(() => {
          if (done) {
            return;
          }

          log.warn('waitUntilReachedTargetTimeframe timed out', {
            timeout,
            current: this.timeframe,
            target: this.targetTimeframe,
            dependencies: Timeframe.dependencies(this.targetTimeframe, this.timeframe)
          });
        })
      ]);
    } else {
      return this._reachedTargetPromise;
    }
  }
}

export interface PipelineAccessor {
  state: PipelineState;
  writer: FeedWriter<FeedMessage.Payload>;
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
  private readonly _feedSetIterator = new FeedSetIterator<FeedMessage>(createMessageSelector(this._timeframeClock), {
    start: mapTimeframeToFeedIndexes(this._initialTimeframe),
    stallTimeout: 1000
  });

  // External state accessor.
  private readonly _state: PipelineState = new PipelineState(this._feedSetIterator, this._timeframeClock);

  // Waits for the message consumer to process the message and yield control back to the pipeline.
  private readonly _processingTrigger = new Trigger().wake();

  // Outbound feed writer.
  private _writer: FeedWriter<FeedMessage.Payload> | undefined;

  private _isOpen = false;

  // prettier-ignore
  constructor(
    private readonly _initialTimeframe: Timeframe = new Timeframe()
  ) {
    this._feedSetIterator.stalled.on((iterator) => {
      log.warn(`Stalled after ${iterator.options.stallTimeout}ms with ${iterator.size} feeds.`);
    });
  }

  get state() {
    return this._state;
  }

  get writer(): FeedWriter<FeedMessage.Payload> {
    assert(this._writer, 'Writer not set.');
    return this._writer;
  }

  getFeeds(): FeedWrapper<FeedMessage>[] {
    return this._feedSetIterator.feeds;
  }

  async addFeed(feed: FeedWrapper<FeedMessage>) {
    await this._feedSetIterator.addFeed(feed);
  }

  setWriteFeed(feed: FeedWrapper<FeedMessage>) {
    assert(!this._writer, 'Writer already set.');
    assert(feed.properties.writable, 'Feed must be writable.');

    this._writer = createMappedFeedWriter<FeedMessage.Payload, FeedMessage>(
      (payload: FeedMessage.Payload) => ({
        timeframe: this._timeframeClock.timeframe,
        payload
      }),
      feed.createFeedWriter()
    );
  }

  async start() {
    log('starting...', {});
    await this._feedSetIterator.open();
    log('started');
  }

  async stop() {
    log('stopping...', {});
    await this._feedSetIterator.close();
    await this._processingTrigger.wait(); // Wait for the in-flight message to be processed.
    log('stopped');
  }

  /**
   * Starts to iterate over the ordered messages from the added feeds.
   * Updates the timeframe clock after the message has bee processed.
   */
  async *consume(): AsyncIterable<FeedMessageBlock> {
    assert(!this._isOpen, 'Pipeline is already being consumed.');
    this._isOpen = true;

    for await (const block of this._feedSetIterator) {
      this._processingTrigger.reset();
      yield block;
      this._processingTrigger.wake();

      this._timeframeClock.updateTimeframe(PublicKey.from(block.feedKey), block.seq);
    }

    // TODO(burdon): Test re-entrant?
    this._isOpen = false;
  }
}
