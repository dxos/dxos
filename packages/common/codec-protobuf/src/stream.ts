//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

type Producer<T> = (callbacks: {
  next: (message: T) => void,
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
          items.push({ closed: true, error });
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
    const disposeCb = producer({
      next: msg => {
        if (this._isClosed) {
          throw new Error('Stream is closed.');
        }

        if (this._messageHandler) {
          this._messageHandler(msg);
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
        this._closeHandler?.(err);
      }
    });
    if (disposeCb) {
      this._dispose = disposeCb;
    }
  }

  subscribe (onMessage: (msg: T) => void, onClose: (error?: Error) => void) {
    assert(!this._messageHandler, 'Stream is already subscribed to.');
    assert(!this._closeHandler, 'Stream is already subscribed to.');
    assert(this._buffer); // Must be not-null.

    for (const message of this._buffer) {
      onMessage(message);
    }
    this._buffer = null;

    // Stream might have allready been closed.
    if (this._isClosed) {
      onClose(this._closeError);
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
