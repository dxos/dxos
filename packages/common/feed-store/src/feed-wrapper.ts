//
// Copyright 2022 DXOS.org
//

import { Range } from 'hypercore';
import { inspect } from 'node:util';
import { Readable, Transform } from 'streamx';

import { Trigger } from '@dxos/async';
import { inspectObject, StackTrace } from '@dxos/debug';
import type { Hypercore, HypercoreProperties, ReadStreamOptions } from '@dxos/hypercore';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { arrayToBuffer, createBinder, rangeFromTo } from '@dxos/util';

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
    invariant(this._hypercore);
    invariant(this._key);
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
    const readStream =
      opts?.batch !== undefined && opts?.batch > 1
        ? new BatchedReadStream(this._hypercore, opts)
        : this._hypercore.createReadStream(opts);

    readStream.pipe(transform, (err: any) => {
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
        invariant(!this._closed, 'Feed closed');
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
    invariant(seq < this.length, 'Invalid seq after write');
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

  has = this._binder.fn(this._hypercore.has);
  get = this._binder.async(this._hypercore.get);
  append = this._binder.async(this._hypercore.append);

  /**
   * Will not resolve if `end` parameter is not specified and the feed is not closed.
   */
  download = this._binder.async(this._hypercore.download) as (range?: Partial<Range>) => Promise<number>;
  undownload = this._binder.fn(this._hypercore.undownload);
  setDownloading = this._binder.fn(this._hypercore.setDownloading);
  replicate: Hypercore<T>['replicate'] = this._binder.fn(this._hypercore.replicate);
  clear = this._binder.async(this._hypercore.clear) as (start: number, end?: number) => Promise<void>;

  /**
   * Clear and check for integrity.
   */
  async safeClear(from: number, to: number) {
    invariant(from >= 0 && from < to && to <= this.length, 'Invalid range');

    const CHECK_MESSAGES = 20;
    const checkBegin = to;
    const checkEnd = Math.min(checkBegin + CHECK_MESSAGES, this.length);

    const messagesBefore = await Promise.all(
      rangeFromTo(checkBegin, checkEnd).map((idx) =>
        this.get(idx, {
          valueEncoding: { decode: (x: Uint8Array) => x },
        }),
      ),
    );

    await this.clear(from, to);

    const messagesAfter = await Promise.all(
      rangeFromTo(checkBegin, checkEnd).map((idx) =>
        this.get(idx, {
          valueEncoding: { decode: (x: Uint8Array) => x },
        }),
      ),
    );

    for (let i = 0; i < messagesBefore.length; i++) {
      const before = arrayToBuffer(messagesBefore[i]);
      const after = arrayToBuffer(messagesAfter[i]);
      if (!before.equals(after)) {
        throw new Error('Feed corruption on clear. There has likely been a data loss.');
      }
    }
  }
}

class BatchedReadStream extends Readable {
  private readonly _feed: Hypercore<any>;
  private readonly _batchSize: number;
  private _cursor: number;
  private _reading = false;

  constructor(feed: Hypercore<any>, opts: ReadStreamOptions = {}) {
    super({
      objectMode: true,
    });
    this._feed = feed;

    invariant(opts.live === true, 'Only live mode supported');
    invariant(opts.batch !== undefined && opts.batch > 1);
    this._batchSize = opts.batch;
    this._cursor = opts.start ?? 0;
  }

  override _open(cb: (err: Error | null) => void): void {
    this._feed.ready(cb);
  }

  override _read(cb: (err: Error | null) => void): void {
    if (this._reading) {
      return;
    }

    if (this._feed.bitfield!.total(this._cursor, this._cursor + this._batchSize) === this._batchSize) {
      this._batchedRead(cb);
    } else {
      this._nonBatchedRead(cb);
    }
  }

  private _nonBatchedRead(cb: (err: Error | null) => void) {
    this._feed.get(this._cursor, { wait: true }, (err, data) => {
      if (err) {
        cb(err);
      } else {
        this._cursor++;
        this._reading = false;
        this.push(data);
        cb(null);
      }
    });
  }

  private _batchedRead(cb: (err: Error | null) => void) {
    this._feed.getBatch(this._cursor, this._cursor + this._batchSize, { wait: true }, (err, data) => {
      if (err) {
        cb(err);
      } else {
        this._cursor += data.length;
        this._reading = false;
        for (const item of data) {
          this.push(item);
        }
        cb(null);
      }
    });
  }
}
