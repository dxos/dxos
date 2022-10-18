//
// Copyright 2020 DXOS.org
//

import { FeedBlock } from '@dxos/hypercore';
import { log } from '@dxos/log';

import { FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';

/**
 * Base class for an async iterable feed.
 */
export abstract class AbstractFeedIterator<T = {}> implements AsyncIterable<FeedBlock<T>> {
  protected _running = false;

  get running () {
    return this._running;
  }

  async start () {
    log('starting...');
    await this._onOpen();
    this._running = true;
  }

  async stop () {
    log('stopping...');
    this._running = false;
  }

  async open () {
    await this._onOpen();
  }

  async close () {
    await this._onClose();
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
      if (!block) {
        break;
      }

      yield block;
    }
  }

  abstract _onOpen (): Promise<void>
  abstract _onClose (): Promise<void>
  abstract _nextBlock (): Promise<FeedBlock<T> | undefined>;
}

/**
 * Iterator that reads blocks from a single feed.
 */
export class FeedIterator<T = {}> extends AbstractFeedIterator<T> {
  private readonly _queue: FeedQueue<T>;

  constructor (
    private readonly _feed: FeedWrapper<T>
  ) {
    super();
    this._queue = new FeedQueue<T>(this._feed);
  }

  override async _onOpen (): Promise<void> {
    await this._queue.open();
  }

  override async _onClose (): Promise<void> {
    await this._queue.close();
  }

  override async _nextBlock (): Promise<FeedBlock<T> | undefined> {
    return this._queue.pop();
  }
}
