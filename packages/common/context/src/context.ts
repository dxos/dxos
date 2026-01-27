//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import { StackTrace } from '@dxos/debug';
import { type CallMetadata, log } from '@dxos/log';
import { safeInstanceof } from '@dxos/util';

import { ContextDisposedError } from './context-disposed-error';

export type ContextErrorHandler = (error: Error, ctx: Context) => void;

export type DisposeCallback = () => any | Promise<any>;

export type CreateContextProps = {
  name?: string;
  parent?: Context;
  attributes?: Record<string, any>;
  onError?: ContextErrorHandler;
};

const DEBUG_LOG_DISPOSE = false;

/**
 * Maximum number of dispose callbacks before we start logging warnings.
 */
const MAX_SAFE_DISPOSE_CALLBACKS = 300;

const DEFAULT_ERROR_HANDLER: ContextErrorHandler = (error, ctx) => {
  if (error instanceof ContextDisposedError) {
    return;
  }

  void ctx.dispose();

  // Will generate an unhandled rejection.
  throw error;
};

type ContextFlags = number;

const CONTEXT_FLAG_IS_DISPOSED: ContextFlags = 1 << 0;

/**
 * Whether the dispose callback leak was detected.
 */
const CONTEXT_FLAG_LEAK_DETECTED: ContextFlags = 1 << 1;

/**
 * NOTE: Context is not reusable after it is disposed.
 */
@safeInstanceof('Context')
export class Context {
  static default(): Context {
    return new Context();
  }

  readonly #disposeCallbacks: DisposeCallback[] = [];

  readonly #name?: string = undefined;
  readonly #parent?: Context = undefined;
  readonly #attributes: Record<string, any>;
  readonly #onError: ContextErrorHandler;

  #flags: ContextFlags = 0;
  #disposePromise?: Promise<boolean> = undefined;

  #signal: AbortSignal | undefined = undefined;

  public maxSafeDisposeCallbacks = MAX_SAFE_DISPOSE_CALLBACKS;

  constructor(params: CreateContextProps = {}, callMeta?: Partial<CallMetadata>) {
    this.#name = getContextName(params, callMeta);
    this.#parent = params.parent;
    this.#attributes = params.attributes ?? {};
    this.#onError = params.onError ?? DEFAULT_ERROR_HANDLER;
  }

  get #isDisposed() {
    return !!(this.#flags & CONTEXT_FLAG_IS_DISPOSED);
  }

  set #isDisposed(value: boolean) {
    this.#flags = value ? this.#flags | CONTEXT_FLAG_IS_DISPOSED : this.#flags & ~CONTEXT_FLAG_IS_DISPOSED;
  }

  get #leakDetected() {
    return !!(this.#flags & CONTEXT_FLAG_LEAK_DETECTED);
  }

  set #leakDetected(value: boolean) {
    this.#flags = value ? this.#flags | CONTEXT_FLAG_LEAK_DETECTED : this.#flags & ~CONTEXT_FLAG_LEAK_DETECTED;
  }

  get disposed() {
    return this.#isDisposed;
  }

  get disposeCallbacksLength() {
    return this.#disposeCallbacks.length;
  }

  get signal(): AbortSignal {
    if (this.#signal) {
      return this.#signal;
    }
    const controller = new AbortController();
    this.#signal = controller.signal;
    this.onDispose(() => controller.abort());
    return this.#signal;
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
    if (this.#isDisposed) {
      // Call the callback immediately if the context is already disposed.
      void (async () => {
        try {
          await callback();
        } catch (error: any) {
          log.catch(error, { context: this.#name });
        }
      })();
    }

    this.#disposeCallbacks.push(callback);
    if (this.#disposeCallbacks.length > this.maxSafeDisposeCallbacks && !this.#leakDetected) {
      this.#leakDetected = true;
      const callSite = new StackTrace().getStackArray(1)[0].trim();
      log.warn('Context has a large number of dispose callbacks (this might be a memory leak).', {
        context: this.#name,
        callSite,
        count: this.#disposeCallbacks.length,
      });
    }

    // Remove handler.
    return () => {
      const index = this.#disposeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.#disposeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Runs all dispose callbacks.
   * Callbacks are run in the reverse order they were added.
   * This function never throws.
   * It is safe to ignore the returned promise if the caller does not wish to wait for callbacks to complete.
   * Disposing context means that onDispose will throw an error and any errors raised will be logged and not propagated.
   * @returns true if there were no errors during the dispose process.
   */
  async dispose(throwOnError = false): Promise<boolean> {
    if (this.#disposePromise) {
      return this.#disposePromise;
    }

    // TODO(burdon): Probably should not be set until the dispose is complete, but causes tests to fail if moved.
    this.#isDisposed = true;

    // Set the promise before running the callbacks.
    let resolveDispose!: (value: boolean) => void;
    const promise = new Promise<boolean>((resolve) => {
      resolveDispose = resolve;
    });
    this.#disposePromise = promise;

    // Process last first.
    // Clone the array so that any mutations to the original array don't affect the dispose process.
    const callbacks = Array.from(this.#disposeCallbacks).reverse();
    this.#disposeCallbacks.length = 0;

    if (DEBUG_LOG_DISPOSE) {
      log('disposing', { context: this.#name, count: callbacks.length });
    }

    let i = 0;
    let clean = true;
    const errors: Error[] = [];
    for (const callback of callbacks) {
      try {
        await callback();
        i++;
      } catch (err: any) {
        clean = false;
        if (throwOnError) {
          errors.push(err);
        } else {
          log.catch(err, { context: this.#name, callback: i, count: callbacks.length });
        }
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors);
    }

    resolveDispose(clean);
    if (DEBUG_LOG_DISPOSE) {
      log('disposed', { context: this.#name });
    }

    return clean;
  }

  /**
   * Raise the error inside the context.
   * The error will be propagated to the error handler.
   * IF the error handler is not set, the error will dispose the context and cause an unhandled rejection.
   */
  raise(error: Error): void {
    if (this.#isDisposed) {
      // TODO(dmaretskyi): Don't log those.
      // log.warn('Error in disposed context', error);
      return;
    }

    try {
      this.#onError(error, this);
    } catch (err) {
      // Generate an unhandled rejection and stop the error propagation.
      void Promise.reject(err);
    }
  }

  derive({ onError, attributes }: CreateContextProps = {}): Context {
    const newCtx = new Context({
      // TODO(dmaretskyi): Optimize to not require allocating a new closure for every context.
      onError: async (error) => {
        if (!onError) {
          this.raise(error);
        } else {
          try {
            await onError(error, this);
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
    if (key in this.#attributes) {
      return this.#attributes[key];
    }
    if (this.#parent) {
      return this.#parent.getAttribute(key);
    }

    return undefined;
  }

  [Symbol.toStringTag] = 'Context';
  [inspect.custom] = () => this.toString();

  toString(): string {
    return `Context(${this.#isDisposed ? 'disposed' : 'active'})`;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }
}

const getContextName = (params: CreateContextProps, callMeta?: Partial<CallMetadata>): string | undefined => {
  if (params.name) {
    return params.name;
  }
  if (callMeta?.F?.length) {
    const pathSegments = callMeta?.F.split('/');
    return `${pathSegments[pathSegments.length - 1]}#${callMeta?.L ?? 0}`;
  }
  return undefined;
};
