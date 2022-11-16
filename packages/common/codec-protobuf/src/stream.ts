//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Context } from '@dxos/context';

const log = debug('dxos:codec-protobuf:stream');

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
        }
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
  static unwrapPromise<T>(streamPromise: Promise<Stream<T>>): Stream<T> {
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
        }
      );
      return () => {
        streamPromise.then(
          (stream) => stream.close(),
          // eslint-disable-next-line n/handle-callback-err
          (err) => {
            /* already handled */
          }
        );
      };
    });
  }

  private readonly _ctx: Context;
  private _messageHandler?: (msg: T) => void;
  private _closeHandler?: (error?: Error) => void;
  private _readyHandler?: () => void;

  private _isClosed = false;
  private _closeError: Error | undefined;
  private _producerCleanup: ((err?: Error) => void) | undefined;
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
      }
    });
    this._ctx.onDispose(() => {
      this.close();
    });

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
              throwUnhandledRejection(err);
            }
          } else {
            assert(this._buffer);
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
            throwUnhandledRejection(err);
          }
          void this._ctx.dispose();
        }
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

  subscribe(onMessage: (msg: T) => void, onClose?: (err?: Error) => void) {
    assert(!this._messageHandler, 'Stream is already subscribed to.');
    assert(!this._closeHandler, 'Stream is already subscribed to.');
    assert(this._buffer); // Must be not-null.

    for (const message of this._buffer) {
      try {
        onMessage(message);
      } catch (err: any) {
        // Stop error propagation.
        throwUnhandledRejection(err);
      }
    }

    this._buffer = null;

    // Stream might have allready been closed.
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
    assert(!this._readyHandler, 'Stream already has a handler for the ready event.');
    this._readyHandler = onReady;

    if (this._isReady) {
      onReady();
    }
  }

  /**
   * Close the stream and dispose of any resources.
   */
  // TODO(burdon): Make async.
  close() {
    if (this._isClosed) {
      return;
    }

    this._isClosed = true;
    this._producerCleanup?.();
    this._closeHandler?.(undefined);
    void this._ctx.dispose();

    // Clear function pointers.
    this._messageHandler = undefined;
    this._closeHandler = undefined;
    this._producerCleanup = undefined;
  }
}

/**
 * Asynchronously produces an unhandled rejection.
 *
 * Will terminate the node process with an error.
 * In browser results in an error message in the console.
 * In mocha tests it fails the currently running test.
 *
 * NOTE: Copied from @dxos/debug to avoid circular dependency.
 */
const throwUnhandledRejection = (error: Error) => {
  setTimeout(() => {
    throw error;
  });
};
