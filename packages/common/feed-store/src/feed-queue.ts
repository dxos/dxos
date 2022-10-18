//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { ReadStreamOptions } from 'hypercore';
import throught2 from 'through2';

import { latch } from '@dxos/async';
import { FeedBlock, createReadable } from '@dxos/hypercore';
import { log } from '@dxos/log';

import { FeedWrapper } from './feed-wrapper';

/**
 * Blocks until awakened.
 */
// TODO(burdon): Factor out to @dxos/async.
export class Trigger<T = void> {
  _wake!: (value?: T) => void;

  constructor (
    private readonly _timeout: number = 0
  ) {}

  async wait (timeout: number = this._timeout): Promise<T> {
    return new Promise((resolve, reject) => {
      this._wake = (value?: T) => resolve(value as T);
      if (timeout) {
        setTimeout(() => {
          reject(new Error(`Timed out after ${timeout}ms`));
        }, timeout);
      }
    });
  }

  wake (value?: T) {
    this._wake?.(value);
  }
}

export const defaultReadStreamOptions: ReadStreamOptions = {
  live: true // Keep reading until closed.
};

export type FeedQueueOptions = {}

/**
 * Async queue using an AsyncIterator created from a hypercore.
 */
export class FeedQueue<T = {}> {
  private readonly _trigger = new Trigger<FeedBlock<T>>();
  private _feedStream?: any;
  private _currentBlock?: FeedBlock<T> = undefined;
  private _index = -1;
  private _next?: () => void;

  constructor (
    private readonly _feed: FeedWrapper<T>,
    private readonly _options: FeedQueueOptions = {}
  ) {}

  get feed () {
    return this._feed;
  }

  get opened (): boolean {
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
    if (this.opened) {
      await this.close();
    }

    this._index = options.start ?? 0;
    if (this._index !== 0) {
      console.warn('Start index not yet supported.');
    }

    log('opening...');
    const opts = Object.assign({}, defaultReadStreamOptions, options);
    this._feedStream = createReadable(this._feed.core.createReadStream(opts));

    // TODO(burdon): Is back-pressure relevant? Buffering?
    //  https://nodejs.org/en/docs/guides/backpressuring-in-streams
    const transform = this._feedStream.pipe(throught2.obj((data: any, encoding: string, next: () => void) => {
      this._next = () => {
        this._currentBlock = undefined;
        this._index++;
        next();
      };

      this._currentBlock = {
        key: this._feed.key,
        seq: this._index,
        data
      };

      this._trigger.wake(this._currentBlock);
    }));

    const onClose = () => {
      this._feedStream.unpipe(transform);
      this._feedStream.off('close', onClose);
      this._feedStream = undefined;
      this._currentBlock = undefined;
      this._index = -1;
    };

    this._feedStream.on('close', onClose);

    log('opened');
  }

  /**
   * Closes the queue.
   */
  async close () {
    if (this.opened) {
      assert(this._feedStream);

      log('closing...');
      this._feedStream.destroy();
      const [closed, setClosed] = latch();
      this._feedStream.on('close', setClosed);
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
    if (!this.opened) {
      throw new Error(`Queue not open: ${this.feed.key.truncate()}`);
    }

    let block = this.peek();
    if (!block) {
      block = await this._trigger.wait();
    }

    if (block) {
      this._next?.();
    }

    return block;
  }
}
