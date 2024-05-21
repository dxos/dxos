//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import { log } from '@dxos/log';
import { safeInstanceof } from '@dxos/util';

import { ContextDisposedError } from './context-disposed-error';

export type ContextErrorHandler = (error: Error) => void;

export type DisposeCallback = () => any | Promise<any>;

export type CreateContextParams = {
  name?: string;
  parent?: Context;
  attributes?: Record<string, any>;
  onError?: ContextErrorHandler;
};

/**
 * Maximum number of dispose callbacks before we start logging warnings.
 */
const MAX_SAFE_DISPOSE_CALLBACKS = 300;

@safeInstanceof('Context')
export class Context {
  static default() {
    return new Context();
  }

  private readonly _disposeCallbacks: DisposeCallback[] = [];

  private readonly _name?: string;
  private readonly _parent?: Context;
  private readonly _attributes: Record<string, any>;
  private readonly _onError: ContextErrorHandler;

  private _isDisposed = false;
  private _disposePromise?: Promise<boolean> = undefined;

  public maxSafeDisposeCallbacks = MAX_SAFE_DISPOSE_CALLBACKS;

  constructor({
    name, // TODO(burdon): Automate?
    parent,
    attributes = {},
    onError = (error) => {
      if (error instanceof ContextDisposedError) {
        return;
      }

      void this.dispose();

      // Will generate an unhandled rejection.
      throw error;
    },
  }: CreateContextParams = {}) {
    this._name = name;
    this._parent = parent;
    this._attributes = attributes;
    this._onError = onError;
  }

  get disposed() {
    return this._isDisposed;
  }

  get disposeCallbacksLength() {
    return this._disposeCallbacks.length;
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
  onDispose(callback: DisposeCallback): () => void {
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
    if (this._disposeCallbacks.length > this.maxSafeDisposeCallbacks) {
      log.warn('Context has a large number of dispose callbacks (this might be a memory leak).', {
        count: this._disposeCallbacks.length,
      });
    }

    // Remove handler.
    return () => {
      const index = this._disposeCallbacks.indexOf(callback);
      if (index !== -1) {
        this._disposeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Runs all dispose callbacks.
   * Callbacks are run in the reverse order they were added.
   * This function never throws.
   * It is safe to ignore the returned promise if the caller does not wish to wait for callbacks to complete.
   * Disposing context means that onDispose will throw an error and any errors raised will be logged and not propagated.
   */
  async dispose(throwOnError = false): Promise<boolean> {
    if (this._disposePromise) {
      return this._disposePromise;
    }

    // TODO(burdon): Probably should not be set until the dispose is complete, but causes tests to fail if moved.
    this._isDisposed = true;

    // Set the promise before running the callbacks.
    let resolveDispose!: (value: boolean) => void;
    this._disposePromise = new Promise<boolean>((resolve) => {
      resolveDispose = resolve;
    });

    // Process last first.
    // Clone the array so that any mutations to the original array don't affect the dispose process.
    const callbacks = Array.from(this._disposeCallbacks).reverse();
    this._disposeCallbacks.length = 0;

    if (this._name) {
      log.info('disposing', { context: this._name, count: callbacks.length });
    }

    let i = 0;
    let clean = true;
    for (const callback of callbacks) {
      try {
        await callback();
        i++;
      } catch (err: any) {
        log.catch(err, { context: this._name, callback: i, count: callbacks.length });
        clean = false;
        if (throwOnError) {
          throw err;
        }
      }
    }

    resolveDispose(clean);
    if (this._name) {
      log.info('disposed', { context: this._name });
    }

    return clean;
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

  derive({ onError, attributes }: CreateContextParams = {}): Context {
    const newCtx = new Context({
      // TODO(dmaretskyi): Optimize to not require allocating a new closure for every context.
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
      attributes,
    });

    const clearDispose = this.onDispose(() => newCtx.dispose());
    newCtx.onDispose(clearDispose);
    return newCtx;
  }

  getAttribute(key: string): any {
    if (key in this._attributes) {
      return this._attributes[key];
    }
    if (this._parent) {
      return this._parent.getAttribute(key);
    }

    return undefined;
  }

  [Symbol.toStringTag] = 'Context';
  [inspect.custom] = () => this.toString();

  toString() {
    return `Context(${this._isDisposed ? 'disposed' : 'active'})`;
  }
}
