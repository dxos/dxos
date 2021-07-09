import assert from "assert";

type Producer<T> = (callbacks: {
  next: (message: T) => void,
  close: (error?: Error) => void
}) => (() => void) | void

/**
 * Represents a typed stream of data.
 * 
 * The stream doesn't do any buffering, so the consumer must immediately subscribe to the `message` event,
 * otherwise some messages might be lost.
 * 
 * `close` must be called to clean-up the resources.
 */
// TODO(marik-d): Either implement buffering or make streams lazy (invoke producer on subscription).
export class Stream<T> {
  private _messageHandler?: (msg: T) => void;
  private _closeHandler?: (error?: Error) => void;

  private _isClosed = false;
  private _dispose: (() => void) | undefined;
 
  constructor(producer: Producer<T>) {
    // Delay the execution so that the consumer has a chance to subscribe to the stream.
    // TODO(marik-d): Figure out if we want to start the producer in constructor or lazily on subscription.
    setImmediate(() => {
      const disposeCb = producer({
        next: msg => {
          if(this._isClosed) {
            throw new Error('Stream is closed.')
          }
  
          this._messageHandler?.(msg)
        },
        close: err => {
          if(this._isClosed) {
            return
          }

          this._isClosed = true;
          this._dispose?.();
          this._closeHandler?.(err);
        }
      })
      if(disposeCb) {
        this._dispose = disposeCb;
      }
    })
  }

  subscribe(onMessage: (msg: T) => void, onClose: (error?: Error) => void) {
    assert(!this._isClosed, 'Stream is closed.')
    assert(!this._messageHandler, 'Stream is already subscribed to.')
    assert(!this._closeHandler, 'Stream is already subscribed to.')

    this._messageHandler = onMessage;
    this._closeHandler = onClose;
  }


  /**
   * Close the stream and dispose of any resources.
   */
  close() {
    if(this._isClosed) {
      return
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
