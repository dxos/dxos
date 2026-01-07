import { Resource, type Context } from '@dxos/context';
import type { InitMessage } from './protocol';

/**
 * Manages a pool of workers.
 */
// TODO(dmaretskyi): Ability to name workers (names are available within workers).
// TODO(dmaretskyi): Ability to select between Worker and SharedWorker.
// TODO(dmaretskyi): Provide your own worker-main module URL.
export class Cluster extends Resource {
  readonly #poolSize: number;
  #workers: SharedWorker[] = [];
  readonly #pageId = crypto.randomUUID();
  #mainWorkerPort: MessagePort | null = null;
  #releaseLock: () => void = () => {};

  readonly #livenessLockKey = `page-liveness-lock-${this.#pageId}`;

  constructor(poolSize: number) {
    super();
    this.#poolSize = poolSize;
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
      const url = new URL('./worker-main?worker', import.meta.url);
      // Setting the instanceId in url constructor is a vite compilation error.
      url.searchParams.set('instanceId', i.toString());
      this.#workers.push(new SharedWorker(url, { name: `cluster-${i}`, type: 'module' }));
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
      this.#workers[i].port.postMessage(
        {
          _tag: 'init',
          instanceId: i,
          instanceCount: this.#poolSize,
          pageId: this.#pageId,
          livenessLockKey: this.#livenessLockKey,
          pagePort: null,
          auxiliaryPorts: null,
          mainPort: channel.port2,
        } satisfies InitMessage,
        { transfer: [channel.port2] },
      );
      channels.push(channel);
    }

    this.#workers[0].port.postMessage(
      {
        _tag: 'init',
        instanceId: 0,
        instanceCount: this.#poolSize,
        pageId: this.#pageId,
        livenessLockKey: this.#livenessLockKey,
        pagePort: pageChannel.port2,
        auxiliaryPorts: channels.map((channel) => channel.port1),
        mainPort: null,
      } satisfies InitMessage,
      { transfer: [pageChannel.port2, ...channels.map((channel) => channel.port1)] },
    );

    this.#mainWorkerPort = pageChannel.port1;
  }

  protected override async _close(): Promise<void> {
    this.#workers.forEach((worker) => worker.port.close());
    this.#workers = [];
    this.#mainWorkerPort?.close();
    this.#mainWorkerPort = null;
    this.#releaseLock();
  }
}
