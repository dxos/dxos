//
// Copyright 2020 DXOS.org
//

import safeRace from 'race-as-promised';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { FeedQueue } from './feed-queue.ts';
import { type FeedWrapper } from './feed-wrapper.ts';
import { type FeedBlock } from './types.ts';

/**
 * Base class for an async iterable feed.
 */
export abstract class AbstractFeedIterator<T> implements AsyncIterable<FeedBlock<T>> {
  private _stopTrigger = new Trigger();
  private _runningTrigger = new Trigger();

  protected _open = false;
  protected _running = false;

  toJSON(): { open: boolean; running: boolean } {
    return {
      open: this.isOpen,
      running: this.isRunning,
    };
  }

  get isOpen() {
    return this._open;
  }

  get isRunning() {
    return this._running;
  }

  async open(): Promise<void> {
    if (!this._open) {
      log('opening...');
      await this._onOpen();
      this._open = true;

      await this.start();
      log('opened');
    }
  }

  async close(): Promise<void> {
    if (this._open) {
      log('closing...');
      await this.stop();

      await this._onClose();
      this._open = false;
      log('closed');
    }
  }

  async start(): Promise<void> {
    invariant(this._open);
    if (!this._running) {
      this._running = true;
      // Re-arm: a woken stop trigger from a previous stop would otherwise finish every new
      // generator immediately.
      this._stopTrigger = new Trigger();
      this._runningTrigger.wake();
    }
  }

  async stop(): Promise<void> {
    invariant(this._open);
    if (this._running) {
      this._running = false;
      // Release `waitUntilRunning` waiters so they can observe the stop, then re-arm for the next start.
      this._runningTrigger.wake();
      this._runningTrigger = new Trigger();
      this._stopTrigger.wake();
    }
  }

  /**
   * Resolves once the iterator is running. A generator obtained before {@link start} completes
   * immediately (its loop observes `_running === false`); consumers use this to wait out that
   * window instead of polling a finished generator.
   */
  async waitUntilRunning(): Promise<void> {
    if (this._running) {
      return;
    }
    await this._runningTrigger.wait();
  }

  //
  // AsyncIterable
  //

  [Symbol.asyncIterator]() {
    return this._generator();
  }

  async *_generator() {
    log('started');
    while (this._running) {
      // https://github.com/nodejs/node/issues/17469
      const block = await safeRace([this._stopTrigger.wait(), this._nextBlock()]);

      if (block === undefined) {
        break;
      }

      yield block;
    }

    log('stopped');
  }

  abstract _onOpen(): Promise<void>;
  abstract _onClose(): Promise<void>;
  abstract _nextBlock(): Promise<FeedBlock<T> | undefined>;
}

/**
 * Iterator that reads blocks from a single feed.
 */
export class FeedIterator<T extends {}> extends AbstractFeedIterator<T> {
  private readonly _queue: FeedQueue<T>;

  constructor(private readonly _feed: FeedWrapper<T>) {
    super();
    this._queue = new FeedQueue<T>(this._feed);
  }

  override async _onOpen(): Promise<void> {
    await this._queue.open();
  }

  override async _onClose(): Promise<void> {
    await this._queue.close();
  }

  override async _nextBlock(): Promise<FeedBlock<T> | undefined> {
    return this._queue.pop();
  }
}
