//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { ReadStreamOptions } from 'hypercore';

import { latch } from '@dxos/async';
import { FeedBlock, createAsyncIterator, createReadable } from '@dxos/hypercore';
import { log } from '@dxos/log';

import { FeedWrapper } from './feed-wrapper';

export const defaultReadStreamOptions: ReadStreamOptions = {
  live: true // Keep reading until closed.
};

export type FeedQueueOptions = {}

/**
 * Async queue using an AsyncIterator created from a hypercore.
 */
export class FeedQueue<T = {}> {
  private _iterator?: AsyncIterator<T>;
  private _feedStream?: any;
  private _currentBlock?: FeedBlock<T> = undefined;
  private _index = -1;

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
   * Current index (seq) at the head of the stream.
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

    log('opening...');
    // TODO(burdon): Test performance/stability vs. using hypercore.get and managing an index.
    const opts = Object.assign({}, defaultReadStreamOptions, options);
    this._feedStream = createReadable(this._feed.core.createReadStream(opts));
    this._iterator = createAsyncIterator(this._feedStream);
    this._index = options.start ?? 0;
    if (this._index !== 0) {
      console.warn('Start index not yet supported');
    }

    const onClose = () => {
      this._feedStream.off('close', onClose);
      this._feedStream = undefined;
      this._iterator = undefined;
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
  async peek (): Promise<FeedBlock<T>> {
    if (!this.opened) {
      throw new Error('Not open'); // TODO(burdon): Common error format?
    }

    if (this._currentBlock === undefined) {
      const { value, done }: IteratorResult<T> = await this._iterator!.next();
      if (done) {
        // NOTE: Only called if live=false.
        throw new Error('No more blocks.');
      }

      this._currentBlock = {
        key: this._feed.key,
        seq: this._index,
        data: value
      };
    }

    return this._currentBlock;
  }

  /**
   * Pop block at the head of the queue.
   */
  async pop (): Promise<FeedBlock<T>> {
    if (!this.opened) {
      throw new Error('Not open'); // TODO(burdon): Common error format?
    }

    const value = await this.peek();
    this._currentBlock = undefined;
    if (value) {
      this._index++;
    }

    return value;
  }
}
