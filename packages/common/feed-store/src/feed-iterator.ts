//
// Copyright 2020 DXOS.org
//

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';

import { FeedBlock, FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';

/**
 * Asynchronous iterator that reads blocks from multiple feeds in timeframe order.
 */
export class FeedIterator<T = {}> implements AsyncIterable<FeedBlock<T>> {
  private readonly _queue: FeedQueue<T>;

  private _running = false;

  constructor (
    private readonly _feed: FeedWrapper
  ) {
    this._queue = new FeedQueue(this._feed);
  }

  get running () {
    return this._running;
  }

  async start () {
    log('starting...');
    this._running = true;
    await this._queue.open();
    return this;
  }

  async stop () {
    log('stopping...');
    this._running = false;
    return this;
  }

  //
  // AsyncIterable
  //

  [Symbol.asyncIterator] () {
    return this._generator();
  }

  async * _generator () {
    while (this._running) {
      const block = await this._nextBlock();
      if (block) {
        yield block;
      } else {
        await sleep(1000); // TODO(burdon): Config.
      }
    }
  }

  // TODO(burdon): Needs to be woken up?
  async _nextBlock (): Promise<FeedBlock<T> | undefined> {
    // console.log('popping...');
    const block = await this._queue.pop();
    // console.log('popped');
    return block;
  }
}
