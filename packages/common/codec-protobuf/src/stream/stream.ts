//
// Copyright 2021 DXOS.org
//

import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { throwUnhandledError, type MaybePromise } from '@dxos/util';

type Callbacks<T> = {
  ctx: Context;

  /**
   * Advises that the producer is ready to stream the data.
   * Called automatically with the first call to `next`.
   */
  ready: () => void;

  /**
   * Sends a message into the stream.
   */
  next: (message: T) => void;

  /**
   * Closes the stream.
   * Optional error can be provided.
   */
  close: (err?: Error) => void;
};

type Producer<T> = (callbacks: Callbacks<T>) => ((err?: Error) => void) | void;

export type StreamItem<T> = { ready: true } | { data: T } | { closed: true; error?: Error };

// TODO(burdon): Implement Observable<T> pattern to simplify callbacks.
// stream.subscribe({
//   onData: (data: CustomData) => {
//   },
//   onOpen: () => {
//   },
//   onClose: () => {
//   },
//   onError: () => {
//   }
// });
//
// stream.unsubscribe();
// await stream.close90:

/**
 * Represents a typed stream of data.
 * In concept it's a Promise that can resolve multiple times.
 * Can only have one subscriber.
 * `close` must be called to clean-up the resources.
 */
export class Stream<T> {
  /**
   * Consumes the entire stream to the end until it closes and returns a promise with the resulting items.
   */
  static consume<T>(stream: Stream<T>): Promise<StreamItem<T>[]> {
    return new Promise((resolve) => {
      const items: StreamItem<T>[] = [];

      stream.onReady(() => {
        items.push({ ready: true });
      });
      stream.subscribe(
        (data) => {
          items.push({ data });
        },
        (error) => {
          if (error) {
            items.push({ closed: true, error });
          } else {
            items.push({ closed: true });
          }
          resolve(items);
        },
      );
    });
  }

  static async consumeData<T>(stream: Stream<T>): Promise<T[]> {
    const entries = await Stream.consume(stream);
    const res: T[] = [];
    for (const entry of entries) {
      if ('data' in entry) {
        res.push(entry.data);
      } else if ('closed' in entry && entry.closed === true) {
        if (entry.error) {
          throw entry.error;
        } else {
          break;
        }
      }
    }
    return res;
  }

  static async first<T>(stream: Stream<T>): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      stream.subscribe(
        (data) => {
          resolve(data);
          void stream.close();
        },
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(undefined);
          }
        },
      );
    });
  }

  /**
   * Maps all data coming through the stream.
   */
  static map<T, U>(source: Stream<T>, map: (data: T) => U): Stream<U> {
    return new Stream(({ ready, next, close }) => {
      source.onReady(ready);
      source.subscribe((data) => next(map(data)), close);

      return () => source.close();
    });
  }

  /**
   * Converts Promise<Stream<T>> to Stream<T>.
   */
  static unwrapPromise<T>(streamPromise: MaybePromise<Stream<T>>): Stream<T> {
    if (streamPromise instanceof Stream) {
      return streamPromise;
    }

    return new Stream(({ ready, next, close }) => {
      streamPromise.then(
        (stream) => {
          stream.onReady(ready);
          stream.subscribe(next, close);
        },
        (err) => {
          close(err);
        },
      );
      return () => {
        streamPromise.then(
          (stream) => stream.close(),
          // eslint-disable-next-line n/handle-callback-err
          (err) => {
            /* already handled */
          },
        );
      };
    });
  }

  private readonly _ctx: Context;
  private _messageHandler?: (msg: T) => void = undefined;
  private _closeHandler?: (error?: Error) => void = undefined;
  private _readyHandler?: () => void = undefined;

  private _isClosed = false;
  private _closeError: Error | undefined = undefined;
  private _producerCleanup: ((err?: Error) => void) | undefined = undefined;
  private _readyPromise: Promise<void>;
  private _resolveReadyPromise!: () => void;
  private _isReady = false;

  /**
   * Buffer messages before subscription. Set to null when buffer is no longer needed.
   */
  private _buffer: T[] | null = [];

  constructor(producer: Producer<T>) {
    this._readyPromise = new Promise((resolve) => {
      this._resolveReadyPromise = resolve;
    });

    this._ctx = new Context({
      onError: (err) => {
        if (this._isClosed) {
          return;
        }

        this._isClosed = true;
        this._closeError = err;
        this._producerCleanup?.(err);
        this._closeHandler?.(err);
        void this._ctx.dispose();
      },
    });
    this._ctx.onDispose(() => this.close());

    try {
      const producerCleanup = producer({
        ctx: this._ctx,

        ready: () => {
          this._markAsReady();
        },

        next: (msg) => {
          if (this._isClosed) {
            log('Stream is closed, dropping message.');
            return;
          }

          this._markAsReady();

          if (this._messageHandler) {
            try {
              this._messageHandler(msg);
            } catch (err: any) {
              // Stop error propagation.
              throwUnhandledError(err);
            }
          } else {
            invariant(this._buffer);
            this._buffer.push(msg);
          }
        },

        close: (err) => {
          if (this._isClosed) {
            return;
          }

          this._isClosed = true;
          this._closeError = err;
          this._producerCleanup?.(err);
          try {
            this._closeHandler?.(err);
          } catch (err: any) {
            // Stop error propagation.
            throwUnhandledError(err);
          }
          void this._ctx.dispose();
        },
      });

      if (producerCleanup) {
        this._producerCleanup = producerCleanup;
      }
    } catch (err: any) {
      this._ctx.raise(err);
    }
  }

  private _markAsReady() {
    if (!this._isReady) {
      this._isReady = true;
      this._readyHandler?.();
      this._resolveReadyPromise();
    }
  }

  // TODO(burdon): Can this be cancelled?
  subscribe(onMessage: (msg: T) => void, onClose?: (err?: Error) => void) {
    invariant(!this._messageHandler, 'Stream is already subscribed to.');
    invariant(!this._closeHandler, 'Stream is already subscribed to.');
    invariant(this._buffer); // Must be not-null.

    for (const message of this._buffer) {
      try {
        onMessage(message);
      } catch (err: any) {
        // Stop error propagation.
        throwUnhandledError(err);
      }
    }

    this._buffer = null;

    // Stream might have already have been closed.
    if (this._isClosed) {
      onClose?.(this._closeError);
      return;
    }

    this._messageHandler = onMessage;
    this._closeHandler = onClose;
  }

  /**
   * Resolves when stream is ready.
   */
  // TODO(burdon): Gather all callbacks into single observer.
  waitUntilReady(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * Registers a callback to be called when stream is ready.
   */
  onReady(onReady: () => void): void {
    invariant(!this._readyHandler, 'Stream already has a handler for the ready event.');
    this._readyHandler = onReady;
    if (this._isReady) {
      onReady();
    }
  }

  /**
   * Close the stream and dispose of any resources.
   */
  async close() {
    if (this._isClosed) {
      return;
    }

    this._isClosed = true;
    this._producerCleanup?.();
    this._closeHandler?.(undefined);
    await this._ctx.dispose();

    // Clear function pointers.
    this._messageHandler = undefined;
    this._closeHandler = undefined;
    this._producerCleanup = undefined;
  }
}
