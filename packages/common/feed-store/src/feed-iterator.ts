//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Timeframe } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

import { FeedBlock, FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';

// TODO(burdon): Create single and multi iterator.

/**
 * Select next block.
 */
export type FeedBlockSelector<T> = (blocks: FeedBlock<T>[]) => number | undefined

/**
 * Asynchronous iterator that reads blocks from multiple feeds in timeframe order.
 */
export class FeedIterator<T> implements AsyncIterable<FeedBlock<T>> {
  private readonly _candidateFeeds = new ComplexMap<PublicKey, FeedQueue<T>>(PublicKey.hash);

  private _running = false;
  private _count = 0;

  constructor (
    private readonly _selector: FeedBlockSelector<T>,
    private readonly _start: Timeframe
  ) {
    assert(_selector);
  }

  get size () {
    return this._candidateFeeds.size;
  }

  get running () {
    return this._running;
  }

  start () {
    log('starting...');
    this._running = true;
    return this;
  }

  stop () {
    log('stopping...');
    this._running = false;
    return this;
  }

  addFeed (feed: FeedWrapper) {
    this._candidateFeeds.set(feed.key, new FeedQueue(feed));
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator
   */
  [Symbol.asyncIterator] () {
    return this._generator();
  }

  async * _generator () {
    while (this._running) {
      const block = await this._nextBlock();
      if (block) {
        log('next'); // TODO(burdon): Count.
        yield block;
      }
    }
  }

  // TODO(burdon): Use selectors. Trigger on feed added and on feed append.
  async _nextBlock (): Promise<FeedBlock<T> | undefined> {

    // for (const queue of Array.from(this._candidateFeeds.values())) {
    //   console.log(queue.length);
    // }

    const block: FeedBlock<T> = {
      seq: this._count++,
      data: '???' as any
    };

    return block;
  }
}
