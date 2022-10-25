//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import { FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';
import { FeedBlock } from './types';

/**
 * Base class for an async iterable feed.
 */
export abstract class AbstractFeedIterator<T> implements AsyncIterable<FeedBlock<T>> {
  private readonly _stopTrigger = new Trigger();

  protected _open = false;
  protected _running = false;

  toJSON() {
    return {
      open: this.isOpen,
      running: this.isRunning
    };
  }

  get isOpen() {
    return this._open;
  }

  get isRunning() {
    return this._running;
  }

  async open() {
    if (!this._open) {
      log('opening...');
      await this._onOpen();
      this._open = true;

      await this.start();
      log('opened');
    }
  }

  async close() {
    if (this._open) {
      log('closing...');
      await this.stop();

      await this._onClose();
      this._open = false;
      log('closed');
    }
  }

  async start() {
    assert(this._open);
    if (!this._running) {
      this._running = true;
    }
  }

  async stop() {
    assert(this._open);
    if (this._running) {
      this._running = false;
      this._stopTrigger.wake();
    }
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
      const block = await Promise.race([this._stopTrigger.wait(), this._nextBlock()]);

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
