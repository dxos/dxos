//
// Copyright 2021 DXOS.org
//

export type ErrorHandler = (error: Error) => void;

/**
 * Represents a stream of errors that entities can expose.
 */
export class ErrorStream {
  private readonly _creationStack: string;

  private _handler: ErrorHandler | undefined;

  private _unhandledErrors = 0;

  constructor () {
    this._creationStack = getStackTrace();
  }

  raise (error: Error) {
    if (this._handler) {
      this._handler(error);
    } else {
      this._unhandledError(error);
    }
  }

  handle (handler: ErrorHandler) {
    this._handler = handler;
  }

  assertNoUnhandledErrors () {
    if (this._unhandledErrors > 0) {
      throw new Error(`Assertion failed: expected no unhandled errors to be thrown, but ${this._unhandledErrors} were thrown.\nThey originated from:\n${this._creationStack}`);
    }
  }

  pipeTo(receiver: ErrorStream) {
    this.handle(error => receiver.raise(error))
  }

  private _unhandledError (error: Error) {
    this._unhandledErrors++;

    console.error(error);
    console.error(`The above unhandled error originated from:\n${this._creationStack}`);
  }
}

// TODO(marik-d): Use one from @dxos/util.
function getStackTrace () {
  try {
    throw new Error();
  } catch (err) {
    return err.stack.split('\n').slice(1).join('\n');
  }
}
