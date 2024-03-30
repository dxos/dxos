import '@dxos/util';
import { Context } from './context';

export interface Lifecycle {
  open?(): Promise<void> | void;
  close?(): Promise<void> | void;
}

export enum ResourceState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  ERROR = 'ERROR',
}

export class Resource implements Lifecycle {
  #resourceState = ResourceState.CLOSED;
  #openPromise: Promise<void> | null = null;
  #closePromise: Promise<void> | null = null;
  #ctx: Context = this.#createContext();
  #parentCtx: Context = new Context();

  protected get _resourceState() {
    return this.#resourceState;
  }

  protected get _ctx() {
    return this.#ctx;
  }

  protected async _open(): Promise<void> {}
  protected async _close(): Promise<void> {}
  protected async _catch(err: Error): Promise<void> {
    throw err;
  }

  async open(ctx?: Context): Promise<void> {
    if (this.#resourceState === ResourceState.OPEN) {
      return;
    } else if (this.#resourceState === ResourceState.ERROR) {
      throw new Error(`Invalid state: ${this.#resourceState}`);
    }
    await (this.#openPromise ??= this.#open(ctx));
  }

  async close(): Promise<void> {
    if (this.#resourceState === ResourceState.CLOSED) {
      return;
    }
    await (this.#closePromise ??= this.#close());
  }

  async [Symbol.asyncDispose]() {
    await this.close();
  }

  async #open(ctx?: Context) {
    if (ctx) {
      this.#parentCtx = ctx;
    }
    await this._open();
    this.#resourceState = ResourceState.OPEN;
  }

  async #close() {
    await this.#ctx.dispose();
    await this._close();
    this.#ctx = this.#createContext();
    this.#resourceState = ResourceState.CLOSED;
  }

  #createContext() {
    return new Context({
      onError: (error) =>
        queueMicrotask(async () => {
          try {
            await this._catch(error);
          } catch (err: any) {
            this.#resourceState = ResourceState.ERROR;
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
