//
// Copyright 2022 DXOS.org
//

import type { Hypercore, HypercoreProperties, ReadStreamOptions } from 'hypercore';
import assert from 'node:assert';
import { inspect } from 'node:util';
import { Readable, Transform } from 'streamx';

import { Trigger } from '@dxos/async';
import { inspectObject, StackTrace } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createBinder } from '@dxos/util';

import { FeedWriter, WriteReceipt } from './feed-writer';

/**
 * Async feed wrapper.
 */
export class FeedWrapper<T extends {}> {
  private readonly _pendingWrites = new Set<StackTrace>();
  private readonly _binder = createBinder(this._hypercore);

  // Pending while writes are happening. Resolves when there are no pending writes.
  private readonly _writeLock = new Trigger();

  private _closed = false;

  constructor(
    private _hypercore: Hypercore<T>,
    private _key: PublicKey, // TODO(burdon): Required since currently patching the key inside factory.
  ) {
    assert(this._hypercore);
    assert(this._key);
    this._writeLock.wake();
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      feedKey: this._key,
      length: this.properties.length,
      opened: this.properties.opened,
      closed: this.properties.closed,
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

  createReadableStream(opts?: ReadStreamOptions): Readable {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const transform = new Transform({
      transform(data: any, cb: (err?: Error | null, data?: any) => void) {
        // Delay until write is complete.
        void self._writeLock.wait().then(() => {
          this.push(data);
          cb();
        });
      },
    });
    this._hypercore.createReadStream(opts).pipe(transform, (err) => {
      // Ignore errors.
      // We might get "Writable stream closed prematurely" error.
      // Its okay since the pipeline is closed and does not expect more messages.
    });
    return transform;
  }

  createFeedWriter(): FeedWriter<T> {
    return {
      write: async (data: T, { afterWrite } = {}) => {
        log('write', { feed: this._key, seq: this._hypercore.length, data });
        assert(!this._closed, 'Feed closed');
        const stackTrace = new StackTrace();

        try {
          // Pending writes pause the read stream.
          this._pendingWrites.add(stackTrace);
          if (this._pendingWrites.size === 1) {
            this._writeLock.reset();
          }

          const receipt = await this.appendWithReceipt(data);
          await afterWrite?.(receipt);

          return receipt;
        } finally {
          // Unblock the read stream after the write (and callback) is complete.
          this._pendingWrites.delete(stackTrace);
          if (this._pendingWrites.size === 0) {
            this._writeLock.wake();
          }
        }
      },
    };
  }

  async appendWithReceipt(data: T): Promise<WriteReceipt> {
    const seq = await this.append(data);
    assert(seq < this.length, 'Invalid seq after write');
    log('write complete', { feed: this._key, seq });
    const receipt: WriteReceipt = {
      feedKey: this.key,
      seq,
    };
    return receipt;
  }

  get opened() {
    return this._hypercore.opened;
  }

  get closed() {
    return this._hypercore.closed;
  }

  get length() {
    return this._hypercore.length;
  }

  on = this._binder.fn(this._hypercore.on);
  off = this._binder.fn(this._hypercore.off);

  open = this._binder.async(this._hypercore.open);
  private _close = this._binder.async(this._hypercore.close);
  close = async () => {
    if (this._pendingWrites.size) {
      log.warn('Closing feed with pending writes', {
        feed: this._key,
        count: this._pendingWrites.size,
        pendingWrites: Array.from(this._pendingWrites.values()).map((stack) => stack.getStack()),
      });
    }
    this._closed = true;
    await this._close();
  };

  get = this._binder.async(this._hypercore.get);
  append = this._binder.async(this._hypercore.append);
  download = this._binder.async(this._hypercore.download);
  replicate: Hypercore<T>['replicate'] = this._binder.fn(this._hypercore.replicate);
  clear = this._binder.async(this._hypercore.clear) as (start: number, end?: number) => Promise<void>;
}
