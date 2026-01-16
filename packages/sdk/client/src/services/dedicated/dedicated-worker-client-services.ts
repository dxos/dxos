import { Event } from '@dxos/async';
import { clientServiceBundle, type ClientServices, type ClientServicesProvider } from '@dxos/client-protocol';
import type { ServiceBundle } from '@dxos/rpc';
import { ClientServicesProxy } from '../service-proxy';
import { Resource } from '@dxos/context';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import type { DedicatedWorkerInitMessage } from './types';
import { log } from '@dxos/log';
import { Worker } from '@dxos/isomorphic-worker';
import { SharedWorkerConnection } from '../shared-worker-connection';
import { Config } from '@dxos/config';

export type WorkerOrPort = Worker | MessagePort;

export class DedicatedWorkerClientServices extends Resource implements ClientServicesProvider {
  #services!: ClientServicesProxy;
  #createWorker: () => WorkerOrPort;
  #worker?: WorkerOrPort;
  #connection!: SharedWorkerConnection;

  readonly closed = new Event<Error | undefined>();

  constructor(createWorker: () => WorkerOrPort) {
    super();
    this.#createWorker = createWorker;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get services(): Partial<ClientServices> {
    return this.#services.services;
  }

  override async _open(): Promise<void> {
    log('creating worker');
    this.#worker = this.#createWorker();

    const { appPort, systemPort, livenessLockKey } = await new Promise<DedicatedWorkerInitMessage>(
      (resolve, reject) => {
        // Browser worker
        this.#worker!.onmessage = (event) => {
          const { type } = event.data as DedicatedWorkerInitMessage;
          if (type === 'init') {
            resolve(event.data as DedicatedWorkerInitMessage);
          }
        };
        if (this.#worker instanceof Worker) {
          this.#worker.onerror = (e) => reject(e.error);
        }
      },
    );
    log('got worker ports');
    void navigator.locks.request(livenessLockKey, () => {
      log('worker terminated');
      if (this.isOpen) {
        this.closed.emit(new Error('Dedicated worker terminated.'));
      }
    });

    this.#connection = new SharedWorkerConnection({
      // TODO(dmaretskyi): Config management.
      config: new Config(),
      systemPort: createWorkerPort({ port: systemPort }),
    });
    log('opening SharedWorkerConnection');
    await this.#connection.open({
      origin: typeof location !== 'undefined' ? location.origin : 'unknown',
    });
    log('open SharedWorkerConnection');

    this.#services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
    await this.#services.open();
  }

  override async _close(): Promise<void> {
    await this.#services.close();
    if (this.#worker instanceof Worker) {
      this.#worker?.terminate();
    } else if (this.#worker instanceof MessagePort) {
      this.#worker.close();
    }
  }
}
