//
// Copyright 2024 DXOS.org
//

import '@dxos/util';
import { Context } from './context';

export interface Lifecycle {
  open?(ctx?: Context): Promise<any> | any;
  close?(): Promise<any> | any;
}

export enum LifecycleState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  ERROR = 'ERROR',
}

/**
 * Base class for resources that need to be opened and closed.
 */
export class Resource implements Lifecycle {
  #lifecycleState = LifecycleState.CLOSED;
  #openPromise: Promise<void> | null = null;
  #closePromise: Promise<void> | null = null;
  #ctx: Context = this.#createContext();
  #parentCtx: Context = new Context();

  protected get _lifecycleState() {
    return this.#lifecycleState;
  }

  protected get _ctx() {
    return this.#ctx;
  }

  /**
   * To be overridden by subclasses.
   */
  protected async _open(ctx: Context): Promise<void> {}

  /**
   * To be overridden by subclasses.
   */
  protected async _close(ctx: Context): Promise<void> {}

  /**
   * Error handler for errors that are caught by the context.
   * By default errors are bubbled up to the parent context which is passed to the open method.
   */
  protected async _catch(err: Error): Promise<void> {
    throw err;
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

  async [Symbol.asyncDispose]() {
    await this.close();
  }

  async #open(ctx?: Context) {
    this.#closePromise = null;
    if (ctx) {
      this.#parentCtx = ctx;
    }
    await this._open(this.#parentCtx);
    this.#lifecycleState = LifecycleState.OPEN;
  }

  async #close(ctx = new Context()) {
    this.#openPromise = null;
    await this.#ctx.dispose();
    await this._close(ctx);
    this.#ctx = this.#createContext();
    this.#lifecycleState = LifecycleState.CLOSED;
  }

  #createContext() {
    return new Context({
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
}

export const openInContext = async <T extends Lifecycle>(ctx: Context, resource: T): Promise<T> => {
  await resource.open?.(ctx);
  ctx.onDispose(() => resource.close?.());

  return resource;
};
