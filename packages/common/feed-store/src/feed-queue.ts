//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { ReadStreamOptions } from 'hypercore';
// import { Readable } from 'streamx';

import { latch } from '@dxos/async';
import { createAsyncIterator, createReadable } from '@dxos/hypercore';

import { FeedWrapper } from './feed-wrapper';

/**
 * Async queue using an AsyncIterator created from a hypercore.
 */
export class FeedQueue<T> {
  private _iterator?: AsyncIterator<T>;
  private _feedStream?: any;
  private _current?: T = undefined;
  private _currentSeq = -1;

  constructor (
    private readonly _feed: FeedWrapper
  ) {}

  get opened (): boolean {
    return Boolean(this._feedStream);
  }

  /**
   * Sequence number of the next element to be read.
   */
  get seq (): number {
    return this._currentSeq;
  }

  get length (): number {
    return this._feed.properties.length;
  }

  get remaining (): number {
    return this.length - this._currentSeq;
  }

  /**
   * Opens (or reopens) the queue.
   */
  async open (options: ReadStreamOptions = {}) {
    if (this.opened) {
      await this.close();
    }

    this._feedStream = createReadable(this._feed.core.createReadStream(options));
    this._iterator = createAsyncIterator(this._feedStream);
    this._currentSeq = options.start ?? 0;

    const onClose = () => {
      this._feedStream.off('close', onClose);
      this._feedStream = undefined;
      this._iterator = undefined;
      this._currentSeq = -1;
    };

    this._feedStream.on('close', onClose);
  }

  /**
   * Closes the queue.
   */
  async close () {
    if (this.opened) {
      assert(this._feedStream);
      console.log('closing...');

      this._feedStream.destroy();
      const [closed, setClosed] = latch();
      this._feedStream.on('close', () => {
        setClosed();
      });

      await closed();
      console.log('closed');
    }
  }

  // TODO(burdon): Timeout?

  async peek (): Promise<T | undefined> {
    if (!this.opened) {
      throw new Error('Not open'); // TODO(burdon): Common error format?
    }

    if (this._current === undefined) {
      const { value, done }: IteratorResult<T> = await this._iterator!.next();
      this._current = done ? undefined : value;
      if (done) {
        console.log('### END ###');
      }
    }

    return this._current;
  }

  async pop (): Promise<T | undefined> {
    if (!this.opened) {
      throw new Error('Not open'); // TODO(burdon): Common error format?
    }

    const value = await this.peek();
    if (value) {
      this._currentSeq++;
    }

    this._current = undefined;
    return value;
  }
}
