//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';

export type ContextErrorHandler = (error: Error) => void;

export type DisposeCallback = () => void | Promise<void>;

export type CreateContextParams = {
  onError?: ContextErrorHandler;
};

export class Context {
  // Marker for the isContext method.
  private readonly _isContext = true;

  /**
   * Checks if the object is a context. Not susceptible to prototype duplication that could happen during bundling.
   */
  static isContext(value: unknown): value is Context {
    return (value as Context)?._isContext === true;
  }

  private readonly _onError: ContextErrorHandler;
  private readonly _disposeCallbacks: DisposeCallback[] = [];
  private _isDisposed = false;

  constructor({
    onError = (error) => {
      void this.dispose();

      // Will generate an unhandled rejection.
      throw error;
    }
  }: CreateContextParams = {}) {
    this._onError = onError;
  }

  /**
   * Schedules a callback to run when the context is disposed.
   * May be async, in this case the disposer might choose to wait for all resource to released.
   * Throwing an error inside the callback will result in the error being logged, but not re-thrown.
   */
  onDispose(callback: DisposeCallback) {
    if (this._isDisposed) {
      throw new Error('Context is already disposed');
    }

    this._disposeCallbacks.push(callback);
  }

  /**
   * Runs all dispose callbacks.
   * Sync callbacks are run in the reverse order they were added.
   * Async callbacks are run in parallel.
   * This function never throws.
   * It is safe to ignore the returned promise if the caller does not wish to wait for callbacks to complete.
   * Disposing context means that onDispose will throw an error and any errors raised will be logged and not propagated.
   */
  dispose(): Promise<void> {
    if (this._isDisposed) {
      throw new Error('Context is already disposed');
    }
    this._isDisposed = true;

    const promises = [];
    for (const callback of this._disposeCallbacks.reverse()) {
      promises.push(
        (async () => {
          try {
            await callback();
          } catch (error: any) {
            log.catch(error);
          }
        })()
      );
    }
    this._disposeCallbacks.length = 0;

    return Promise.all(promises).then(() => {});
  }

  /**
   * Raise the error inside the context.
   * The error will be propagated to the error handler.
   * IF the error handler is not set, the error will dispose the context and cause an unhandled rejection.
   */
  raise(error: Error): void {
    if (this._isDisposed) {
      log.error(`Error in disposed context: ${error}`);
      return;
    }

    try {
      this._onError(error);
    } catch (err) {
      // Generate an unhandled rejection and stop the error propagation.
      void Promise.reject(err);
    }
  }

  derive({ onError }: CreateContextParams): Context {
    const newCtx = new Context({
      onError: async (error) => {
        if (!onError) {
          this.raise(error);
        } else {
          try {
            await onError(error);
          } catch {
            this.raise(error);
          }
        }
      }
    });
    this.onDispose(() => newCtx.dispose());
    return newCtx;
  }
}
