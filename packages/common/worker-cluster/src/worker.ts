import type { InitMessage } from './protocol';

export interface PageHandle {
  id: string;
  port: MessagePort;
}

export interface MainInitalizedEvent {
  /**
   * Id of this worker instance.
   * Always 0 for the main worker.
   */
  instanceId: number;

  /**
   * Name of this worker instance.
   * Name can be configured when cluster is created.
   */
  instanceName: string;

  instanceCount: number;

  /**
   * Ports to all auxiliary workers.
   */
  auxiliaryPorts: MessagePort[];

  /**
   * Initializing page.
   *
   * Will also appear in subsequent page-connected event.
   */
  page: PageHandle;
}

export interface AuxiliaryInitializedEvent {
  /**
   * Id of this worker instance.
   * Always 0 for the main worker.
   */
  instanceId: number;

  /**
   * Name of this worker instance.
   * Name can be configured when cluster is created.
   */
  instanceName: string;

  instanceCount: number;

  /**
   * Port to main worker.
   */
  mainPort: MessagePort;
}

export interface PageConnectedEvent {
  page: PageHandle;
}

export interface PageDisconnectedEvent {
  page: PageHandle;
}

export interface WorkerServerOptions {
  onMainInitialized: (event: MainInitalizedEvent) => void;
  onAuxiliaryInitialized: (event: AuxiliaryInitializedEvent) => void;
  onPageConnected: (event: PageConnectedEvent) => void;
  onPageDisconnected: (event: PageDisconnectedEvent) => void;
}

/**
 * Manages a single worker (main or auxiliary).
 */
export class WorkerServer {
  #options: WorkerServerOptions;

  #instanceId: number | null = null;
  #instanceName: string | null = null;
  #instanceCount: number | null = null;
  #mainPort: MessagePort | null = null;
  #auxiliaryPorts: MessagePort[] | null = null;

  #pages: PageHandle[] = [];

  constructor(options: WorkerServerOptions) {
    this.#options = options;
  }

  /**
   * Connected pages.
   * Only tracked at the main worker.
   */
  get pages(): PageHandle[] {
    return this.#pages;
  }

  // NOTE: Cannot be async.
  init() {
    (globalThis as any).onconnect = (e: MessageEvent<any>) => {
      e.ports[0].onmessage = (ev: MessageEvent<InitMessage>) => {
        if (ev.data._tag !== 'init') {
          throw new Error('Invalid message');
        }

        if (this.#instanceId === null) {
          // First-time init.
          this.#instanceId = ev.data.instanceId;
          this.#instanceName = ev.data.instanceName;
          this.#instanceCount = ev.data.instanceCount;
          this.#mainPort = ev.data.mainPort;
          this.#auxiliaryPorts = ev.data.auxiliaryPorts;
          if (ev.data.pagePort !== null) {
            const page = { id: ev.data.pageId, port: ev.data.pagePort };
            this.#pages.push(page);
            this.#watchPage(page, ev.data.livenessLockKey);
          }

          if (this.#instanceId === 0) {
            this.#options.onMainInitialized({
              instanceId: this.#instanceId,
              instanceName: this.#instanceName!,
              instanceCount: this.#instanceCount,
              auxiliaryPorts: this.#auxiliaryPorts!,
              page: this.#pages[0],
            });
            this.#options.onPageConnected({ page: this.#pages[0] });
          } else {
            this.#options.onAuxiliaryInitialized({
              instanceId: this.#instanceId,
              instanceName: this.#instanceName!,
              instanceCount: this.#instanceCount,
              mainPort: this.#mainPort!,
            });
          }
        } else {
          // Subsequent init.
          if (ev.data.instanceId !== this.#instanceId) {
            throw new Error('instanceId mismatch');
          }
          if (ev.data.instanceName !== this.#instanceName) {
            throw new Error('instanceName mismatch');
          }
          if (ev.data.instanceCount !== this.#instanceCount) {
            throw new Error('instanceCount mismatch');
          }

          if (ev.data.pagePort !== null && this.#instanceId === 0) {
            const page: PageHandle = { id: ev.data.pageId, port: ev.data.pagePort };
            this.#pages.push(page);
            this.#watchPage(page, ev.data.livenessLockKey);
            this.#options.onPageConnected({ page });
          }
        }
      };
    };

    return;
  }

  #watchPage(pageHandle: PageHandle, livenessLockKey: string) {
    navigator.locks.request(livenessLockKey, async (lock) => {
      if (!lock) {
        throw new Error('Expected the lock to be available');
      }

      // If the lock was acquired, the page is closed.
      this.#options.onPageDisconnected({ page: pageHandle });
    });
  }
}
