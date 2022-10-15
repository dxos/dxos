//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';
import { Readable } from 'readable-stream';

import { Event, Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/protocols';

import { createBatchStream } from './create-batch-stream';
import { FeedDescriptor } from './feed-descriptor';
import { FeedBlock } from './types';

const log = debug('dxos:echo:feed-store-iterator:log');

const STALL_TIMEOUT = 1000;

/**
 * Hypercore message block.
 * https://github.com/hypercore-protocol/hypercore
 */
// TODO(burdon): Move to hypercore?
export type FeedBlock<T> = {
  key: PublicKey
  seq: number
  sync: boolean
  path: string
  data: T
}

export type MessageSelector<T> = (candidates: FeedBlock<T>[]) => number | undefined

export type FeedSelector = (descriptor: FeedDescriptor) => boolean

type FeedState<T> = {
  descriptor: FeedDescriptor
  iterator: AsyncIterator<FeedBlock<T>[]>
  sendQueue: FeedBlock<T>[] // TODO(burdon): Why "send"?
  frozen: boolean
}

/**
 * We are using an iterator here instead of a stream to ensure we have full control over how and at what time
 * data is read. This allows the consumer (e.g., PartyProcessor) to control the order in which data is generated.
 * (Streams would not be suitable since Node.js streams have internal buffer that the system tends to eagerly fill.)
 */
// TODO(marik-d): Add stop method.
export class FeedStoreIterator<T> implements AsyncIterable<FeedBlock<T>> {
  // Currently active feeds.
  private readonly _candidateFeeds = new Set<FeedDescriptor>();

  // Indexed by hex key.
  private readonly _openFeeds = new Map<string, FeedState<T>>();

  // Triggers polling the active feeds (e.g., when a new feed is added).
  private readonly _trigger = new Trigger();

  // TODO(burdon): Document.
  private readonly _generatorInstance = this._generator();

  /**
   * Trigger to wait for the iteration to stop in the close method;
   */
  private readonly _closeTrigger = new Trigger();

  // Needed for round-robin ordering.
  private _messageCount = 0;

  private _closed = false;

  public readonly stalled = new Event<FeedBlock<T>[]>();

  /**
   * @param _feedSelector
   * @param _messageSelector
   * @param _skipTimeframe Feeds are read starting from the first message after this timeframe.
   */
  constructor (
    private readonly _feedSelector: FeedSelector,
    private readonly _messageSelector: MessageSelector<T>,
    // TODO(burdon): Has indes for each feed of where to start.
    private readonly _skipTimeframe: Timeframe
  ) {
    assert(_feedSelector);
    assert(_messageSelector);
  }

  /**
   * Adds a feed to be consumed.
   * @param descriptor
   */
  addFeedDescriptor (descriptor: FeedDescriptor) {
    this._candidateFeeds.add(descriptor);
    this._trigger.wake();
    return this;
  }

  /**
   * Closes the iterator
   */
  async close () {
    this._closed = true;
    this._trigger.wake();
    await this._closeTrigger.wait();
  }

  /**
   * This gets called by `for await` loop to get the iterator instance that's then polled on each loop iteration.
   * We return a singleton here to ensure that the `_generator` function only gets called once.
   */
  [Symbol.asyncIterator] () {
    return this._generatorInstance;
  }

  getEndTimeframe () {
    this._reevaluateFeeds();

    return new Timeframe(
      Array.from(this._openFeeds.values())
        .filter(state => state.descriptor.length > 0)
        .map(state => [
          state.descriptor.key,
          state.descriptor.length - 1
        ])
    );
  }

  // TODO(burdon): Comment.
  private _reevaluateFeeds () {
    for (const [, state] of this._openFeeds) {
      if (!this._feedSelector(state.descriptor)) {
        state.frozen = true;
      }
    }

    // Get candidate snapshot since we will be mutating the collection.
    for (const feedDescriptor of Array.from(this._candidateFeeds.values())) {
      if (this._feedSelector(feedDescriptor)) {
        void this._startReadingFromFeed(feedDescriptor);
        this._candidateFeeds.delete(feedDescriptor);
      }
    }
  }

  private async _startReadingFromFeed (feedDescriptor: FeedDescriptor) {
    const frameSeq = this._skipTimeframe.get(PublicKey.from(feedDescriptor.key));
    const startIdx = frameSeq !== undefined ? frameSeq + 1 : 0;

    log(`Starting reading from feed ${feedDescriptor.key.toString()} from sequence ${startIdx}`);

    assert(feedDescriptor.initialized, 'Feed not initialized.');
    const stream = new Readable({ objectMode: true })
      .wrap(createBatchStream(feedDescriptor, { live: true, start: startIdx }) as any);

    this._openFeeds.set(feedDescriptor.key.toHex(), {
      descriptor: feedDescriptor,
      iterator: stream[Symbol.asyncIterator](),
      sendQueue: [], // TODO(burdon): Just head?
      frozen: false
    });
  }

  /**
   * Returns all messages that are waiting to be read from each of the open feeds.
   */
  private _getMessageCandidates () {
    const openFeeds = Array.from(this._openFeeds.values());
    return openFeeds
      .filter(state => !state.frozen && state.sendQueue.length > 0)
      .map(state => state.sendQueue[0]);
  }

  /**
   * @private
   */
  // TODO(burdon): Comment.
  private _popSendQueue () {
    const candidates = this._getMessageCandidates();

    if (candidates.length === 0) {
      return undefined;
    }

    const selected = this._messageSelector(candidates);
    if (selected === undefined) {
      return;
    }

    const pickedCandidate = candidates[selected];
    // TODO(wittjosiah): Is actually a Buffer for some reason. See todo in FeedBlock.
    const state = this._openFeeds.get(pickedCandidate.key.toHex());
    assert(state);

    return state.sendQueue.shift();
  }

  /**
   * @private
   */
  // TODO(burdon): Comment.
  private _pollFeeds () {
    // eslint-disable-next-line unused-imports/no-unused-vars
    for (const [_, feed] of this._openFeeds) {
      if (feed.sendQueue.length === 0) {
        // TODO(burdon): Then/catch?
        feed.iterator.next()
          .then(result => {
            assert(!result.done);
            for (const block of result.value) {
              feed.sendQueue.push({
                ...block,
                key: feed.descriptor.key
              });
            }
            this._trigger.wake();
          }, (err) => {
            if (err.message.includes('Feed is closed')) {
              // When feeds are closed the iterator errors with "Feed is closed" error message. This is fine and we can just stop iterating.
              // TODO(marik-d): Should we remove this feed from the set of tracked ones?
              return;
            }
            // TODO(marik-d): Proper error handling.
            console.error('Feed read error:');
            console.error(err);
          });
      }
    }
  }

  /**
   *
   * @private
   */
  // TODO(burdon): Comment.
  private async _waitForData () {
    this._pollFeeds();

    /*   There is a (rare) potential race condition where one feed gets blocked on a message that is enqueue
     *   in a demuxed stream. Meanwhile the inbound queue dries up (or is deadlocked) so this trigger is not
     *   awoken. A timeout would enable the iterator to restart.
     *   NOTE: When implementing this mechanism be sure to maintain the comment above.
     */
    const timeoutId = setTimeout(() => {
      const candidates = this._getMessageCandidates();
      if (candidates.length > 0) {
        this.stalled.emit(candidates);
      }
    }, STALL_TIMEOUT);
    await this._trigger.wait();
    clearTimeout(timeoutId);

    log('Ready');
    this._trigger.reset(); // TODO(burdon): Reset atomically?
  }

  /**
   *
   */
  // TODO(burdon): Comment.
  async * _generator () {
    while (true) {
      while (true) {
        if (this._closed) {
          this._closeTrigger.wake();
          return;
        }

        this._reevaluateFeeds();

        // TODO(burdon): This always seems to be undefined.
        const message = this._popSendQueue();
        if (message === undefined) {
          log('Paused...');
          break;
        }

        this._messageCount++;

        // TODO(burdon): Add feedKey (FeedMessage)?
        yield message;
      }

      await this._waitForData();
    }
  }
}
