//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';

import { Event, sleep, synchronized, Trigger } from '@dxos/async';
import { Context, rejectOnDispose } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { FeedSetIterator, FeedWrapper, FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedMessageBlock } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';
import { ComplexMap } from '@dxos/util';

import { createMappedFeedWriter } from '../common';
import { createMessageSelector } from './message-selector';
import { mapFeedIndexesToTimeframe, startAfter, TimeframeClock } from './timeframe-clock';

export type WaitUntilReachedTargetParams = {
  /**
   * For cancellation.
   */
  ctx?: Context;
  timeout?: number;

  /**
   * @default true
   */
  breakOnStall?: boolean;
};

/**
 * External state accessor.
 */
export class PipelineState {
  /**
   * @internal
   */
  _ctx = new Context();

  // TODO(dmaretskyi): Remove?.
  public readonly timeframeUpdate = this._timeframeClock.update;

  public readonly stalled = new Event();

  /**
   * @internal
   */
  _startTimeframe: Timeframe = new Timeframe();

  /**
   * Target timeframe we are waiting to reach.
   */
  private _targetTimeframe: Timeframe | undefined;

  /**
   * @internal
   */
  _reachedTargetPromise: Promise<void> | undefined;

  // prettier-ignore
  constructor(
    private _feeds: ComplexMap<PublicKey, FeedWrapper<FeedMessage>>,
    private _timeframeClock: TimeframeClock
  ) { }

  /**
   * Latest theoretical timeframe based on the last mutation in each feed.
   * NOTE: This might never be reached if the mutation dependencies
   */
  // TODO(dmaretskyi): Rename `totalTimeframe`? or `lastTimeframe`.
  get endTimeframe() {
    return mapFeedIndexesToTimeframe(
      Array.from(this._feeds.values())
        .filter((feed) => feed.length > 0)
        .map((feed) => ({
          feedKey: feed.key,
          index: feed.length - 1,
        })),
    );
  }

  get startTimeframe() {
    return this._startTimeframe;
  }

  get timeframe() {
    return this._timeframeClock.timeframe;
  }

  get pendingTimeframe() {
    return this._timeframeClock.pendingTimeframe;
  }

  get targetTimeframe() {
    return this._targetTimeframe ? this._targetTimeframe : new Timeframe();
  }

  get feeds() {
    return Array.from(this._feeds.values());
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
  async waitUntilReachedTargetTimeframe({
    ctx = new Context(),
    timeout,
    breakOnStall = true,
  }: WaitUntilReachedTargetParams = {}) {
    log('waitUntilReachedTargetTimeframe', {
      timeout,
      current: this.timeframe,
      target: this.targetTimeframe,
    });

    this._reachedTargetPromise ??= Promise.race([
      this._timeframeClock.update.waitForCondition(() => {
        return Timeframe.dependencies(this.targetTimeframe, this.timeframe).isEmpty();
      }),
      ...(breakOnStall ? [this.stalled.discardParameter().waitForCount(1)] : []),
    ]);

    let done = false;

    if (timeout) {
      return Promise.race([
        rejectOnDispose(ctx),
        rejectOnDispose(this._ctx),
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
            dependencies: Timeframe.dependencies(this.targetTimeframe, this.timeframe),
          });
        }),
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
  private readonly _timeframeClock = new TimeframeClock(new Timeframe());
  private readonly _feeds = new ComplexMap<PublicKey, FeedWrapper<FeedMessage>>(PublicKey.hash);

  // Inbound feed stream.
  private _feedSetIterator?: FeedSetIterator<FeedMessage>;

  // External state accessor.
  private readonly _state: PipelineState = new PipelineState(this._feeds, this._timeframeClock);

  // Waits for the message consumer to process the message and yield control back to the pipeline.
  private readonly _processingTrigger = new Trigger().wake();
  private readonly _pauseTrigger = new Trigger().wake();

  private _isStopping = false;
  private _isStarted = false;
  private _isOpen = false;
  private _isPaused = false;

  // Outbound feed writer.
  private _writer: FeedWriter<FeedMessage.Payload> | undefined;

  get state() {
    return this._state;
  }

  get writer(): FeedWriter<FeedMessage.Payload> {
    invariant(this._writer, 'Writer not set.');
    return this._writer;
  }

  hasFeed(feedKey: PublicKey) {
    return this._feeds.has(feedKey);
  }

  getFeeds(): FeedWrapper<FeedMessage>[] {
    return this._feedSetIterator!.feeds;
  }

  // NOTE: This cannot be synchronized with `stop` because stop waits for the mutation processing to complete,
  // which might be opening feeds during the mutation processing, which w
  async addFeed(feed: FeedWrapper<FeedMessage>) {
    this._feeds.set(feed.key, feed);
    if (this._feedSetIterator) {
      await this._feedSetIterator.addFeed(feed);
    }
    this._setFeedDownloadState(feed);
  }

  setWriteFeed(feed: FeedWrapper<FeedMessage>) {
    invariant(!this._writer, 'Writer already set.');
    invariant(feed.properties.writable, 'Feed must be writable.');

    this._writer = createMappedFeedWriter<FeedMessage.Payload, FeedMessage>(
      (payload: FeedMessage.Payload) => ({
        timeframe: this._timeframeClock.timeframe,
        payload,
      }),
      feed.createFeedWriter(),
    );
  }

  @synchronized
  async start() {
    log('starting...');
    await this._initIterator();
    await this._feedSetIterator!.open();
    this._isStarted = true;
    log('started');
  }

  @synchronized
  async stop() {
    log('stopping...');
    this._isStopping = true;
    await this._feedSetIterator?.close();
    await this._processingTrigger.wait(); // Wait for the in-flight message to be processed.
    await this._state._ctx.dispose();
    this._state._ctx = new Context();
    this._state._reachedTargetPromise = undefined;
    this._isStarted = false;
    log('stopped');
  }

  /**
   * @param timeframe Timeframe of already processed messages.
   *  The pipeline will start processing messages AFTER this timeframe.
   */
  @synchronized
  async setCursor(timeframe: Timeframe) {
    invariant(!this._isStarted || this._isPaused, 'Invalid state.');

    this._state._startTimeframe = timeframe;
    this._timeframeClock.setTimeframe(timeframe);

    // Cancel downloads of mutations before the cursor.
    for (const feed of this._feeds.values()) {
      this._setFeedDownloadState(feed);
    }

    if (this._feedSetIterator) {
      await this._feedSetIterator.close();
      await this._initIterator();
      await this._feedSetIterator.open();
    }
  }

  /**
   * Calling pause while processing will cause a deadlock.
   */
  @synchronized
  async pause() {
    invariant(this._isStarted, 'Pipeline is not open.');
    if (this._isPaused) {
      return;
    }

    this._pauseTrigger.reset();
    await this._processingTrigger.wait();
    this._isPaused = true;
  }

  @synchronized
  async unpause() {
    invariant(this._isStarted, 'Pipeline is not open.');
    invariant(this._isPaused, 'Pipeline is not paused.');

    this._pauseTrigger.wake();
    this._isPaused = false;
  }

  /**
   * Starts to iterate over the ordered messages from the added feeds.
   * Updates the timeframe clock after the message has bee processed.
   */
  async *consume(): AsyncIterable<FeedMessageBlock> {
    invariant(!this._isOpen, 'Pipeline is already being consumed.');
    this._isOpen = true;

    invariant(this._feedSetIterator, 'Iterator not initialized.');
    let lastFeedSetIterator = this._feedSetIterator;
    let iterable = lastFeedSetIterator[Symbol.asyncIterator]();

    while (!this._isStopping) {
      await this._pauseTrigger.wait();

      // Iterator might have been changed while we were waiting for the processing to complete.
      if (lastFeedSetIterator !== this._feedSetIterator) {
        invariant(this._feedSetIterator, 'Iterator not initialized.');
        lastFeedSetIterator = this._feedSetIterator;
        iterable = lastFeedSetIterator[Symbol.asyncIterator]();
      }

      const { done, value } = await iterable.next();
      if (!done) {
        const block = value ?? failUndefined();
        this._processingTrigger.reset();
        this._timeframeClock.updatePendingTimeframe(PublicKey.from(block.feedKey), block.seq);
        yield block;
        this._processingTrigger.wake();
        this._timeframeClock.updateTimeframe();
      }
    }

    // TODO(burdon): Test re-entrant?
    this._isOpen = false;
  }

  private _setFeedDownloadState(feed: FeedWrapper<FeedMessage>) {
    const timeframe = this._state._startTimeframe;
    const seq = timeframe.get(feed.key) ?? 0;

    feed.undownload({ callback: () => log('undownload') });
    feed.download({ start: seq + 1, linear: true }).catch((err: Error) => {
      log('failed to download feed', { err });
    });
  }

  private async _initIterator() {
    this._feedSetIterator = new FeedSetIterator<FeedMessage>(createMessageSelector(this._timeframeClock), {
      start: startAfter(this._timeframeClock.timeframe),
      stallTimeout: 1000,
    });

    this._feedSetIterator.stalled.on((iterator) => {
      log.warn(`Stalled after ${iterator.options.stallTimeout}ms with ${iterator.size} feeds.`);
      this._state.stalled.emit();
    });

    for (const feed of this._feeds.values()) {
      await this._feedSetIterator.addFeed(feed);
    }
  }
}
