//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

import { FeedWrapper } from './feed-wrapper';

/**
 * Hypercore message block.
 */
export type FeedBlock<T> = {
  key: PublicKey
  seq: number
  sync: boolean
  path: string // TODO(burdon): ???
  data: T
}

export type FeedBlockSelector<T> = (feeds: FeedBlock<T>[]) => number | undefined

export type FeedSelector = (feed: FeedWrapper) => boolean

/**
 * Asynchronous iterator that reads blocks from multiple feeds in timeframe order.
 */
export class FeedStoreIterator<T> implements AsyncIterable<number> {
  private readonly _candidateFeeds = new ComplexMap<PublicKey, FeedWrapper>(key => key.toHex());

  private _running = false;
  private _count = 0;

  constructor (
    private readonly _feedSelector: FeedSelector,
    private readonly _feedBlockSelector: FeedBlockSelector<T>,
    private readonly _skipTimeframe: Timeframe
  ) {
    assert(_feedSelector);
    assert(_feedBlockSelector);
  }

  get running () {
    return this._running;
  }

  start () {
    this._running = true;
    return this;
  }

  stop () {
    this._running = false;
    return this;
  }

  addFeed (feed: FeedWrapper) {
    this._candidateFeeds.set(feed.key, feed);
  }

  // TODO(burdon): Use selectors. Trigger on feed added and on feed append.
  async nextBlock () {
    if (this._count < 10) {
      return ++this._count;
    }
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator
   */
  [Symbol.asyncIterator] () {
    return this._generator();
  }

  async * _generator () {
    while (this._running) {
      const block = await this.nextBlock();
      if (block) {
        yield block;
      }
    }
  }
}
