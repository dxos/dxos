//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';
import { promisify } from 'node:util';

import { Readable, Transform } from 'streamx';

import { Trigger } from '@dxos/async';
import { StackTrace, inspectObject } from '@dxos/debug';
import type { Hypercore, HypercoreProperties, ReadStreamOptions } from '@dxos/hypercore';
import { assertArgument, invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Directory } from '@dxos/random-access-storage';
import { arrayToBuffer, rangeFromTo } from '@dxos/util';
import type { GetOptions, Proof } from '@dxos/vendor-hypercore/hypercore';

import { type FeedWriter, type WriteReceipt } from './feed-writer';

/**
 * Async feed wrapper.
 */
export class FeedWrapper<T extends {}> {
  private _hypercore: Hypercore<T>;
  private readonly _pendingWrites = new Set<StackTrace>();

  // Pending while writes are happening. Resolves when there are no pending writes.
  private readonly _writeLock = new Trigger();

  private _closed = false;

  constructor(
    hypercore: Hypercore<T>,
    private _key: PublicKey, // TODO(burdon): Required since currently patching the key inside factory.
    private _storageDirectory: Directory,
  ) {
    assertArgument(hypercore, 'hypercore');
    this._hypercore = hypercore;
    invariant(this._key);
    this._writeLock.wake();
  }

  [inspect.custom](): string {
    return inspectObject(this);
  }

  toJSON(): { feedKey: PublicKey; length: number; opened: boolean; closed: boolean } {
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
        log('write', { feed: this._key, seq: this._hypercore.length });
        invariant(!this._closed, 'Feed closed');
        const stackTrace = new StackTrace();

        try {
          // Pending writes pause the read stream.
          this._pendingWrites.add(stackTrace);
          if (this._pendingWrites.size === 1) {
            this._writeLock.reset();
          }

          const receipt = await this.appendWithReceipt(data);

          // TODO(dmaretskyi): Removing this will make user-intiated writes faster but might result in a data-loss.
          await this.flushToDisk();

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

  /**
   * Flush pending changes to disk.
   * Calling this is not required unless you want to explicitly wait for data to be written.
   */
  async flushToDisk(): Promise<void> {
    await this._storageDirectory.flush();
  }

  get opened(): boolean {
    return this._hypercore.opened;
  }

  get closed(): boolean {
    return this._hypercore.closed;
  }

  get readable(): boolean {
    return this._hypercore.readable;
  }

  get length(): number {
    return this._hypercore.length;
  }

  get byteLength(): number {
    return this._hypercore.byteLength;
  }

  on(...args: any[]) {
    return (this._hypercore as any).on(...args);
  }

  off(...args: any[]) {
    return (this._hypercore as any).off(...args);
  }

  open(...args: Parameters<Hypercore<T>['open']>) {
    return promisify(this._hypercore.open.bind(this._hypercore) as any)(...args);
  }

  _close(...args: Parameters<Hypercore<T>['close']>) {
    return promisify(this._hypercore.close.bind(this._hypercore) as any)(...args);
  }

  close = async () => {
    if (this._pendingWrites.size) {
      log.warn('Closing feed with pending writes', {
        feed: this._key,
        count: this._pendingWrites.size,
        pendingWrites: Array.from(this._pendingWrites.values()).map((stack) => stack.getStack()),
      });
    }
    this._closed = true;
    await this.flushToDisk();
    await this._close();
  };

  has(start: number, end?: number) {
    return this._hypercore.has(start, end);
  }

  get(index: number, options?: GetOptions) {
    return promisify(this._hypercore.get.bind(this._hypercore) as any)(index, options);
  }

  // TODO(dmaretskyi): Type better
  append(data: any | any[]): Promise<number> {
    return promisify(this._hypercore.append.bind(this._hypercore))(data);
  }

  /**
   * Will not resolve if `end` parameter is not specified and the feed is not closed.
   */
  download(...args: Parameters<Hypercore<T>['download']>) {
    return this._hypercore.download(...args);
  }

  undownload(...args: Parameters<Hypercore<T>['undownload']>) {
    return this._hypercore.undownload(...args);
  }

  setDownloading(...args: Parameters<Hypercore<T>['setDownloading']>) {
    return this._hypercore.setDownloading(...args);
  }

  replicate(...args: Parameters<Hypercore<T>['replicate']>) {
    return this._hypercore.replicate(...args);
  }

  clear(start: number, end?: number) {
    return promisify(this._hypercore.clear.bind(this._hypercore))(start, end);
  }

  proof(index: number, options?: any) {
    return promisify(this._hypercore.proof.bind(this._hypercore))(index);
  }

  put(index: number, data: T, proof: Proof) {
    return promisify(this._hypercore.put.bind(this._hypercore))(index, data, proof);
  }

  putBuffer(index: number, data: Buffer | Uint8Array, proof: Proof, peer: null): Promise<void> {
    return promisify((this._hypercore as any)._putBuffer.bind(this._hypercore) as any)(index, data, proof, peer);
  }

  /**
   * Clear and check for integrity.
   */
  async safeClear(from: number, to: number): Promise<void> {
    invariant(from >= 0 && from < to && to <= this.length, 'Invalid range');

    const CHECK_MESSAGES = 20;
    const checkBegin = to;
    const checkEnd = Math.min(checkBegin + CHECK_MESSAGES, this.length);

    const messagesBefore = await Promise.all(
      rangeFromTo(checkBegin, checkEnd).map((idx) =>
        this.get(idx, {
          valueEncoding: { decode: (x: Uint8Array) => x } as any,
        }),
      ),
    );

    await this.clear(from, to);

    const messagesAfter = await Promise.all(
      rangeFromTo(checkBegin, checkEnd).map((idx) =>
        this.get(idx, {
          valueEncoding: { decode: (x: Uint8Array) => x } as any,
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
  private readonly _batch: number;
  private _cursor: number;
  private _reading = false;

  constructor(feed: Hypercore<any>, opts: ReadStreamOptions = {}) {
    super({ objectMode: true });
    invariant(opts.live === true, 'Only live mode supported');
    invariant(opts.batch !== undefined && opts.batch > 1);
    this._feed = feed;
    this._batch = opts.batch;
    this._cursor = opts.start ?? 0;
  }

  override _open(cb: (err: Error | null) => void): void {
    this._feed.ready(cb);
  }

  override _read(cb: (err: Error | null) => void): void {
    if (this._reading) {
      return;
    }

    if (this._feed.bitfield!.total(this._cursor, this._cursor + this._batch) === this._batch) {
      this._batchedRead(cb);
    } else {
      this._nonBatchedRead(cb);
    }
  }

  private _nonBatchedRead(cb: (err: Error | null) => void): void {
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

  private _batchedRead(cb: (err: Error | null) => void): void {
    this._feed.getBatch(this._cursor, this._cursor + this._batch, { wait: true }, (err, data) => {
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
