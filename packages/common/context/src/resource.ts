import '@dxos/util';
import { Context } from './context';

export interface Lifecycle {
  open?(): Promise<any> | any;
  close?(): Promise<any> | any;
}

export enum LifecycleState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  ERROR = 'ERROR',
}

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

  protected async _open(ctx: Context): Promise<void> {}
  protected async _close(ctx: Context): Promise<void> {}
  protected async _catch(err: Error): Promise<void> {
    throw err;
  }

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

export async function openInContext<T extends Resource>(ctx: Context, resource: T): Promise<T> {
  await resource.open(ctx);
  ctx.onDispose(() => resource.close());

  return resource;
}
