//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

const log = debug('dxos:codec-protobuf:stream');

type Producer<T> = (callbacks: {
  next: (message: T) => void
  close: (error?: Error) => void
}) => (() => void) | void

export type StreamItem<T> =
  | { data: T }
  | { closed: true, error?: Error }

/**
 * Represents a typed stream of data.
 *
 * Can only have one subscriber.
 *
 * `close` must be called to clean-up the resources.
 */
export class Stream<T> {
  /**
   * Consumes the entire stream to the end until it closes and returns a promise with the resulting items.
   */
  static consume <T> (stream: Stream<T>): Promise<StreamItem<T>[]> {
    return new Promise(resolve => {
      const items: StreamItem<T>[] = [];

      stream.subscribe(
        data => {
          items.push({ data });
        },
        error => {
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

  private _messageHandler?: (msg: T) => void;
  private _closeHandler?: (error?: Error) => void;

  private _isClosed = false;
  private _closeError: Error | undefined;
  private _dispose: (() => void) | undefined;

  /**
   * Buffer messages before subscription. Set to null when buffer is no longer needed.
   */
  private _buffer: T[] | null = [];

  constructor (producer: Producer<T>) {
    const disposeCallback = producer({
      next: msg => {
        if (this._isClosed) {
          log('Stream is closed, dropping message.');
          return;
        }

        if (this._messageHandler) {
          try {
            this._messageHandler(msg);
          } catch (error: any) {
            // Stop error propagation.
            throwUnhandledRejection(error);
          }
        } else {
          assert(this._buffer);
          this._buffer.push(msg);
        }
      },

      close: err => {
        if (this._isClosed) {
          return;
        }

        this._isClosed = true;
        this._closeError = err;
        this._dispose?.();
        try {
          this._closeHandler?.(err);
        } catch (error: any) {
          // Stop error propagation.
          throwUnhandledRejection(error);
        }
      }
    });

    if (disposeCallback) {
      this._dispose = disposeCallback;
    }
  }

  subscribe (onMessage: (msg: T) => void, onClose?: (error?: Error) => void) {
    assert(!this._messageHandler, 'Stream is already subscribed to.');
    assert(!this._closeHandler, 'Stream is already subscribed to.');
    assert(this._buffer); // Must be not-null.

    for (const message of this._buffer) {
      try {
        onMessage(message);
      } catch (error: any) {
        // Stop error propagation.
        throwUnhandledRejection(error);
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
   * Close the stream and dispose of any resources.
   */
  close () {
    if (this._isClosed) {
      return;
    }

    this._isClosed = true;
    this._dispose?.();
    this._closeHandler?.(undefined);

    // Clear function pointers.
    this._messageHandler = undefined;
    this._closeHandler = undefined;
    this._dispose = undefined;
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
