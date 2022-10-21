//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { ReadStreamOptions } from 'hypercore';
import { Readable, Writable } from 'streamx';

import { Event, latch, Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import { FeedWrapper } from './feed-wrapper';
import { FeedBlock } from './types';

export const defaultReadStreamOptions: ReadStreamOptions = {
  live: true // Keep reading until closed.
};

export type FeedQueueOptions = {}

/**
 * Async queue using an AsyncIterator created from a hypercore.
 */
export class FeedQueue<T extends {}> {
  public updated = new Event<FeedQueue<T>>();

  private readonly _messageTrigger = new Trigger<FeedBlock<T>>({ autoReset: true });

  private _feedStream?: Readable;
  private _feedConsumer?: Writable;
  private _currentBlock?: FeedBlock<T> = undefined;
  private _index = -1;
  private _next?: () => void;

  constructor (
    private readonly _feed: FeedWrapper<T>,
    private readonly _options: FeedQueueOptions = {}
  ) {}

  toJSON () {
    return {
      feedKey: this._feed.key,
      index: this.index,
      length: this.length,
      open: this.isOpen
    };
  }

  get feed () {
    return this._feed;
  }

  get isOpen (): boolean {
    return Boolean(this._feedStream);
  }

  get length (): number {
    return this._feed.properties.length;
  }

  /**
   * Index (seq) of next block to be read.
   */
  get index () {
    return this._index;
  }

  /**
   * Opens (or reopens) the queue.
   */
  async open (options: ReadStreamOptions = {}) {
    if (this.isOpen) {
      await this.close();
    }

    this._index = options.start ?? 0;
    if (this._index !== 0) {
      console.warn('Start index not yet supported.');
    }

    log('opening', { key: this._feed.key });

    // TODO(burdon): Open with starting range.
    const opts = Object.assign({}, defaultReadStreamOptions, options);
    this._feedStream = this._feed.core.createReadStream(opts);

    // TODO(burdon): Consider buffering?
    this._feedConsumer = this._feedStream.pipe(new Writable({
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
    }));

    log('opened');
  }

  /**
   * Closes the queue.
   */
  async close () {
    if (this.isOpen) {
      assert(this._feedStream);
      assert(this._feedConsumer);

      log('closing', { feed: this._feed.key });
      const [closed, setClosed] = latch();
      this._feedConsumer.once('close', () => {
        this._feedStream = undefined;
        this._feedConsumer = undefined;
        this._currentBlock = undefined;
        this._index = -1;
        setClosed();
      });

      this._feedStream.destroy();
      this._feedConsumer.destroy();
      await closed();
      log('closed');
    }
  }

  /**
   * Get the block at the head of the queue without removing it.
   */
  peek (): FeedBlock<T> | undefined {
    return this._currentBlock;
  }

  /**
   * Pop block at the head of the queue.
   */
  async pop (): Promise<FeedBlock<T>> {
    if (!this.isOpen) {
      throw new Error(`Queue not open: ${this.feed.key.truncate()}`);
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
