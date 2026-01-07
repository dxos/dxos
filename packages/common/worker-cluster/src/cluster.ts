import { Resource, type Context } from '@dxos/context';
import type { InitMessage } from './protocol';

export interface ClusterOptions {
  poolSize: number;

  /**
   * @example
   * ```ts
   * const createWorker = (instanceId, name) => {
   *   const url = new URL('./worker-main?worker', import.meta.url);
   *   // Setting the instanceId in url constructor is a vite compilation error.
   *   url.searchParams.set('instanceId', instanceId.toString());
   *   return new SharedWorker(url, { name, type: 'module' });
   * }
   * ```
   */
  createWorker: (instanceId: number, name: string) => Worker | SharedWorker;

  /**
   * Worker names.
   *
   * @default `cluster-${instanceId}`
   */
  names?: string[];
}

/**
 * Manages a pool of workers.
 */
export class Cluster extends Resource {
  readonly #poolSize: number;
  readonly #createWorker: (instanceId: number, name: string) => Worker | SharedWorker;
  readonly #names: string[];

  #workers: (Worker | SharedWorker)[] = [];
  readonly #pageId = crypto.randomUUID();
  #mainWorkerPort: MessagePort | null = null;
  #releaseLock: () => void = () => {};

  readonly #livenessLockKey = `page-liveness-lock-${this.#pageId}`;

  constructor(options: ClusterOptions) {
    super();
    this.#poolSize = options.poolSize;
    this.#createWorker = options.createWorker;
    if (options.names) {
      if (options.names.length !== options.poolSize) {
        throw new Error('Names length must match pool size');
      }
      this.#names = options.names;
    } else {
      this.#names = Array.from({ length: options.poolSize }, (_, i) => `cluster-${i}`);
    }
  }

  get mainWorkerPort(): MessagePort | null {
    return this.#mainWorkerPort;
  }

  protected override async _open(_ctx: Context): Promise<void> {
    await new Promise<void>((resolve) =>
      navigator.locks.request(this.#livenessLockKey, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          throw new Error('Failed to acquire liveness lock');
        }
        resolve();

        // Hang forever so that lock is never released.
        await new Promise<void>((resolve) => {
          this.#releaseLock = resolve;
        });
      }),
    );

    for (let i = 0; i < this.#poolSize; i++) {
      this.#workers.push(this.#createWorker(i, this.#names[i]));
    }

    // Port1 - stored in page, Port2 - sent to main worker.
    const pageChannel = new MessageChannel();

    /**
     * Worker-to-Worker message channels.
     *
     * Port1 - sent to main worker.
     * Port2 - sent to aux worker.
     */
    const channels: MessageChannel[] = [];
    for (let i = 1; i < this.#poolSize; i++) {
      const channel = new MessageChannel();
      const message: InitMessage = {
        _tag: 'init',
        instanceId: i,
        instanceName: this.#names[i],
        instanceCount: this.#poolSize,
        pageId: this.#pageId,
        livenessLockKey: this.#livenessLockKey,
        pagePort: null,
        auxiliaryPorts: null,
        mainPort: channel.port2,
      };
      const worker = this.#workers[i];
      if (worker instanceof SharedWorker) {
        worker.port.postMessage(message, { transfer: [channel.port2] });
      } else {
        worker.postMessage(message, { transfer: [channel.port2] });
      }
      channels.push(channel);
    }

    const message: InitMessage = {
      _tag: 'init',
      instanceId: 0,
      instanceName: this.#names[0],
      instanceCount: this.#poolSize,
      pageId: this.#pageId,
      livenessLockKey: this.#livenessLockKey,
      pagePort: pageChannel.port2,
      auxiliaryPorts: channels.map((channel) => channel.port1),
      mainPort: null,
    };
    const worker = this.#workers[0];
    if (worker instanceof SharedWorker) {
      worker.port.postMessage(message, { transfer: [pageChannel.port2, ...channels.map((channel) => channel.port1)] });
    } else {
      worker.postMessage(message, { transfer: [pageChannel.port2, ...channels.map((channel) => channel.port1)] });
    }

    this.#mainWorkerPort = pageChannel.port1;
  }

  protected override async _close(): Promise<void> {
    for (const worker of this.#workers) {
      if (worker instanceof SharedWorker) {
        worker.port.close();
      } else {
        worker.terminate();
      }
    }
    this.#workers = [];
    this.#mainWorkerPort?.close();
    this.#mainWorkerPort = null;
    this.#releaseLock();
  }
}
