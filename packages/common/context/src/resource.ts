//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';
import { throwUnhandledError } from '@dxos/util';

import { Context } from './context';

export enum LifecycleState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  ERROR = 'ERROR',
}

export interface Lifecycle {
  open?(ctx?: Context): Promise<any> | any;
  close?(): Promise<any> | any;
}

// Feature flag to be enabled later.
const CLOSE_RESOURCE_ON_UNHANDLED_ERROR = false;

/**
 * Base class for resources that need to be opened and closed.
 */
export abstract class Resource implements Lifecycle {
  #lifecycleState = LifecycleState.CLOSED;
  #openPromise: Promise<void> | null = null;
  #closePromise: Promise<void> | null = null;

  /**
   * Managed internally by the resource.
   * Recreated on close.
   * Errors are propagated to the `_catch` method and the parent context.
   */
  #internalCtx: Context = this.#createContext();

  /**
   * Context that is used to bubble up errors that are not handled by the resource.
   * Provided in the open method.
   */
  #parentCtx: Context = this.#createParentContext();

  /**
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using
   */
  [Symbol.dispose]() {
    if (this.isOpen) {
      log.warn('resource disposed while open', { name: this.#name });
    }

    void this.close();
  }

  get #name() {
    return Object.getPrototypeOf(this).constructor.name;
  }

  get isOpen() {
    return this.#lifecycleState === LifecycleState.OPEN && this.#closePromise == null;
  }

  protected get _lifecycleState() {
    return this.#lifecycleState;
  }

  protected get _ctx() {
    return this.#internalCtx;
  }

  /**
   * To be overridden by subclasses.
   */
  protected async _open(_ctx: Context): Promise<void> {}

  /**
   * To be overridden by subclasses.
   */
  protected async _close(_ctx: Context): Promise<void> {}

  /**
   * Error handler for errors that are caught by the context.
   * By default, errors are bubbled up to the parent context which is passed to the open method.
   */
  protected async _catch(err: Error): Promise<void> {
    if (CLOSE_RESOURCE_ON_UNHANDLED_ERROR) {
      try {
        await this.close();
      } catch (doubleErr: any) {
        throwUnhandledError(doubleErr);
      }
    }
    throw err;
  }

  /**
   * Calls the provided function, opening and closing the resource.
   * NOTE: Consider using `using` instead.
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using
   */
  async use<T>(fn: (resource: this) => Promise<T>): Promise<T> {
    try {
      await this.open();
      return await fn(this);
    } finally {
      await this.close();
    }
  }

  /**
   * Opens the resource.
   * If the resource is already open, it does nothing.
   * If the resource is in an error state, it throws an error.
   * If the resource is closed, it waits for it to close and then opens it.
   * @param ctx - Context to use for opening the resource. This context will receive errors that are not handled in `_catch`.
   */
  async open(ctx?: Context): Promise<this> {
    switch (this.#lifecycleState) {
      case LifecycleState.OPEN:
        return this;
      case LifecycleState.ERROR:
        throw new Error(`Invalid state: ${this.#lifecycleState}`);
      default:
    }

    await this.#closePromise;
    await (this.#openPromise ??= this.#open(ctx));
    return this;
  }

  /**
   * Closes the resource.
   * If the resource is already closed, it does nothing.
   */
  async close(ctx?: Context): Promise<this> {
    if (this.#lifecycleState === LifecycleState.CLOSED) {
      return this;
    }
    await this.#openPromise;
    await (this.#closePromise ??= this.#close(ctx));
    return this;
  }

  /**
   * Waits until the resource is open.
   */
  async waitUntilOpen(): Promise<void> {
    switch (this.#lifecycleState) {
      case LifecycleState.OPEN:
        return;
      case LifecycleState.ERROR:
        throw new Error(`Invalid state: ${this.#lifecycleState}`);
    }

    if (!this.#openPromise) {
      throw new Error('Resource is not being opened');
    }
    await this.#openPromise;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  async #open(ctx?: Context): Promise<void> {
    this.#closePromise = null;
    this.#parentCtx = ctx?.derive({ name: this.#name }) ?? this.#createParentContext();
    await this._open(this.#parentCtx);
    this.#lifecycleState = LifecycleState.OPEN;
  }

  async #close(ctx = Context.default()): Promise<void> {
    this.#openPromise = null;
    await this.#internalCtx.dispose();
    await this._close(ctx);
    this.#internalCtx = this.#createContext();
    this.#lifecycleState = LifecycleState.CLOSED;
  }

  #createContext(): Context {
    return new Context({
      name: this.#name,
      onError: (error) =>
        queueMicrotask(async () => {
          try {
            await this._catch(error);
          } catch (err: any) {
            this.#lifecycleState = LifecycleState.ERROR;
            this.#parentCtx.raise(err);
          }
        }),
    });
  }

  #createParentContext(): Context {
    return new Context({ name: this.#name });
  }
}

export const openInContext = async <T extends Lifecycle>(ctx: Context, resource: T): Promise<T> => {
  await resource.open?.(ctx);
  ctx.onDispose(() => resource.close?.());
  return resource;
};
