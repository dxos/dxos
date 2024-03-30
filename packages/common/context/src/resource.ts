import '@dxos/util';
import { Context } from './context';
import { log } from '@dxos/log';

export interface Lifecycle {
  open?(): Promise<void> | void;
  close?(): Promise<void> | void;
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

  @log.method()
  async open(ctx?: Context): Promise<void> {
    switch (this.#lifecycleState) {
      case LifecycleState.OPEN:
        return;
      case LifecycleState.ERROR:
        throw new Error(`Invalid state: ${this.#lifecycleState}`);
      default:
    }
    await this.#closePromise;
    await (this.#openPromise ??= this.#open(ctx));
  }

  @log.method()
  async close(ctx?: Context): Promise<void> {
    if (this.#lifecycleState === LifecycleState.CLOSED) {
      return;
    }
    await this.#openPromise;
    await (this.#closePromise ??= this.#close(ctx));
  }

  async [Symbol.asyncDispose]() {
    await this.close();
  }

  async #open(ctx?: Context) {
    if (ctx) {
      this.#parentCtx = ctx;
    }
    await this._open(this.#parentCtx);
    this.#lifecycleState = LifecycleState.OPEN;
  }

  async #close(ctx = new Context()) {
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
