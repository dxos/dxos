//
// Copyright 2021 DXOS.org
//

export type ErrorHandlerCallback = (error: Error) => void;

/**
 * Represents a stream of errors that entities can expose.
 */
export class ErrorStream {
  private _handler: ErrorHandlerCallback | undefined;

  private _unhandledErrors = 0;

  assertNoUnhandledErrors() {
    if (this._unhandledErrors > 0) {
      throw new Error(
        `Assertion failed: expected no unhandled errors to be thrown, but ${this._unhandledErrors} were thrown.`
      );
    }
  }

  raise(error: Error) {
    if (this._handler) {
      this._handler(error);
    } else {
      this._unhandledError(error);
    }
  }

  handle(handler: ErrorHandlerCallback) {
    this._handler = handler;
  }

  pipeTo(receiver: ErrorStream) {
    this.handle((error) => receiver.raise(error));
  }

  private _unhandledError(error: Error) {
    this._unhandledErrors++;

    setTimeout(() => {
      throw error;
    });
  }
}
