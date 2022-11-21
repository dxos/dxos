//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Hypercore, HypercoreProperties } from 'hypercore';
import { Readable } from 'streamx';
import { inspect } from 'util';

import { inspectObject, StackTrace } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createBinder } from '@dxos/util';

import { FeedWriter } from './feed-writer';

/**
 * Async feed wrapper.
 */
export class FeedWrapper<T extends {}> {
  private readonly _pendingWrites = new Set<StackTrace>();

  private readonly _binder = createBinder(this._hypercore);

  constructor(
    private _hypercore: Hypercore<T>,
    private _key: PublicKey // TODO(burdon): Required since currently patching the key inside factory.
  ) {
    assert(this._hypercore);
    assert(this._key);
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      feedKey: this._key,
      length: this.properties.length,
      opened: this.properties.opened,
      closed: this.properties.closed
    };
  }

  get key(): PublicKey {
    return this._key;
  }

  get core(): Hypercore<T> {
    return this._hypercore;
  }

  // TODO(burdon): Create proxy.
  get properties(): HypercoreProperties {
    return this._hypercore;
  }

  createReadableStream(): Readable {
    return this._hypercore.createReadStream({ live: true });
  }

  createFeedWriter(): FeedWriter<T> {
    return {
      write: async (data: T) => {
        log('write', { feed: this._key, seq: this._hypercore.length, data });
        const seq = await this.append(data);
        log('write complete', { feed: this._key, seq });
        return {
          feedKey: this.key,
          seq
        };
      }
    };
  }

  get opened() {
    return this._hypercore.opened;
  }

  get closed() {
    return this._hypercore.closed;
  }

  on = this._binder.fn(this._hypercore.on);
  off = this._binder.fn(this._hypercore.off);

  open = this._binder.async(this._hypercore.open);
  _close = this._binder.async(this._hypercore.close);
  async close() {
    if (this._pendingWrites.size) {
      log.warn(`Closing feed with pending writes:`, {
        count: this._pendingWrites.size,
        writes: [...this._pendingWrites].map(stack => stack.getStack())
      });
    }

    await this._close();
  }

  get = this._binder.async(this._hypercore.get);
  __append = this._binder.async(this._hypercore.append);
  async append(data: any) {
    // Cheap to capture unless you call getStack().
    const stack = new StackTrace();
    try {
      this._pendingWrites.add(stack);

      // TODO(burdon): Intercept.
      // log('>>', { data, stack: stack.getStack() });
      const res = await this.__append(data);
      // log('>> DONE', { data, stack: stack.getStack(), seq: res });
      return res;

    } finally {
      this._pendingWrites.delete(stack);
    }
  }

  download = this._binder.async(this._hypercore.download);

  replicate = this._binder.fn(this._hypercore.replicate);
}
