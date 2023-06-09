//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';
import { safeInstanceof } from '@dxos/util';

export type ContextErrorHandler = (error: Error) => void;

export type DisposeCallback = () => void | Promise<void>;

export type CreateContextParams = {
  onError?: ContextErrorHandler;
};

/**
 * Maximum number of dispose callbacks before we start logging warnings.
 */
const MAX_SAFE_DISPOSE_CALLBACKS = 100;

@safeInstanceof('Context')
export class Context {
  private readonly _onError: ContextErrorHandler;
  private readonly _disposeCallbacks: DisposeCallback[] = [];
  private _isDisposed = false;
  private _disposePromise?: Promise<void>;

  constructor({
    onError = (error) => {
      void this.dispose();

      // Will generate an unhandled rejection.
      throw error;
    },
  }: CreateContextParams = {}) {
    this._onError = onError;
  }

  get disposed() {
    return this._isDisposed;
  }

  /**
   * Schedules a callback to run when the context is disposed.
   * May be async, in this case the disposer might choose to wait for all resource to released.
   * Throwing an error inside the callback will result in the error being logged, but not re-thrown.
   *
   * NOTE: Will call the callback immediately if the context is already disposed.
   * 
   * @returns A function that can be used to remove the callback from the dispose list.
   */
  onDispose(callback: DisposeCallback) {
    if (this._isDisposed) {
      // Call the callback immediately if the context is already disposed.
      void (async () => {
        try {
          await callback();
        } catch (error: any) {
          log.catch(error);
        }
      })();
    }

    this._disposeCallbacks.push(callback);
    if (this._disposeCallbacks.length > MAX_SAFE_DISPOSE_CALLBACKS) {
      log.warn('Context has a large number of dispose callbacks. This might be a memory leak.', { count: this._disposeCallbacks.length, safeThreshold: MAX_SAFE_DISPOSE_CALLBACKS });
    }

    return () => {
      const index = this._disposeCallbacks.indexOf(callback);
      if (index !== -1) {
        this._disposeCallbacks.splice(index, 1);
      }
    }
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
    if (this._disposePromise) {
      return this._disposePromise;
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
        })(),
      );
    }
    this._disposeCallbacks.length = 0;

    return (this._disposePromise = Promise.all(promises).then(() => { }));
  }

  /**
   * Raise the error inside the context.
   * The error will be propagated to the error handler.
   * IF the error handler is not set, the error will dispose the context and cause an unhandled rejection.
   */
  raise(error: Error): void {
    if (this._isDisposed) {
      // TODO(dmaretskyi): Don't log those.
      // log.warn('Error in disposed context', error);
      return;
    }

    try {
      this._onError(error);
    } catch (err) {
      // Generate an unhandled rejection and stop the error propagation.
      void Promise.reject(err);
    }
  }

  derive({ onError }: CreateContextParams = {}): Context {
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
      },
    });
    this.onDispose(() => newCtx.dispose());
    return newCtx;
  }
}
