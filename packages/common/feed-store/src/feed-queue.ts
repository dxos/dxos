//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { ReadStreamOptions } from 'hypercore';
import { Writable } from 'streamx';
import { inspect } from 'util';

import { Event, latch, Trigger } from '@dxos/async';
import { inspectObject } from '@dxos/debug';
import { log } from '@dxos/log';

import { FeedWrapper } from './feed-wrapper';
import { FeedBlock } from './types';

export const defaultReadStreamOptions: ReadStreamOptions = {
  live: true // Keep reading until closed.
};

export type FeedQueueOptions = {};

/**
 * Async queue using an AsyncIterator created from a hypercore.
 */
export class FeedQueue<T extends {}> {
  public updated = new Event<FeedQueue<T>>();

  private readonly _messageTrigger = new Trigger<FeedBlock<T>>({
    autoReset: true
  });

  private _feedConsumer?: Writable;
  private _next?: () => void;
  private _currentBlock?: FeedBlock<T> = undefined;
  private _index = -1;

  // prettier-ignore
  constructor(
    private readonly _feed: FeedWrapper<T>,
    private readonly _options: FeedQueueOptions = {}
  ) {}

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      feedKey: this._feed.key,
      index: this.index,
      length: this.length,
      open: this.isOpen
    };
  }

  get feed() {
    return this._feed;
  }

  get isOpen(): boolean {
    return Boolean(this._feedConsumer);
  }

  get length(): number {
    return this._feed.properties.length;
  }

  /**
   * Index (seq) of the NEXT block to be read, or -1 if not open.
   */
  get index() {
    return this._index;
  }

  /**
   * Opens (or reopens) the queue.
   */
  async open(options: ReadStreamOptions = {}) {
    if (this.isOpen) {
      // TODO(burdon): Warn if re-opening (e.g., with different starting point).
      return;
    }

    this._index = options.start ?? 0;
    if (this._index !== 0) {
      console.warn('Start index not yet supported.');
    }

    log('opening', { feedKey: this._feed.key });

    // TODO(burdon): Open with starting range.
    const opts = Object.assign({}, defaultReadStreamOptions, options);
    const feedStream = this._feed.core.createReadStream(opts);

    this._feedConsumer = new Writable({
      write: (data: any, next: () => void) => {
        this._next = () => {
          this._next = undefined;
          this._currentBlock = undefined;
          this._index++;
          next();
        };

        this._currentBlock = {
          feedKey: this._feed.key,
          seq: this._index,
          data
        };

        this._messageTrigger.wake(this._currentBlock);
        this.updated.emit(this);
      }
    });

    const onClose = () => {
      if (this._feedConsumer) {
        log('queue closed', { feedKey: this._feed.key });
        this._feedConsumer = undefined;
        this._next = undefined;
        this._currentBlock = undefined;
        this._index = -1;
      }
    };

    // Called if feed is closed externally.
    this._feed.core.once('close', () => {
      log('feed closed', { feedKey: this._feed.key });
      onClose();
    });

    // Called when queue is closed. Throws exception if waiting for `pop`.
    this._feedConsumer.once('close', () => {
      onClose();
    });

    // Pipe readable stream into writable consumer.
    feedStream.pipe(this._feedConsumer, () => {
      onClose();
    });

    log('opened');
  }

  /**
   * Closes the queue.
   */
  async close() {
    if (this.isOpen) {
      assert(this._feedConsumer);
      assert(!this._feed.properties.closed);

      log('closing', { feedKey: this._feed.key });
      const [closed, setClosed] = latch();
      this._feedConsumer.once('close', setClosed);
      this._feedConsumer.destroy();
      this._next?.(); // Release any message currently in the queue (otherwise destroy will block).
      await closed();
      log('closed');
    }
  }

  /**
   * Get the block at the head of the queue without removing it.
   */
  peek(): FeedBlock<T> | undefined {
    return this._currentBlock;
  }

  /**
   * Pop block at the head of the queue.
   */
  async pop(): Promise<FeedBlock<T>> {
    if (!this.isOpen) {
      throw new Error(`Queue closed: ${this.feed.key.truncate()}`);
    }

    let block = this.peek();
    if (!block) {
      block = await this._messageTrigger.wait();
    }

    if (block) {
      this._next?.();
    }

    return block;
  }
}
