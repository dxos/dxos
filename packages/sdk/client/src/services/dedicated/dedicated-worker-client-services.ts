import { Event } from '@dxos/async';
import { clientServiceBundle, type ClientServices, type ClientServicesProvider } from '@dxos/client-protocol';
import type { ServiceBundle } from '@dxos/rpc';
import { ClientServicesProxy } from '../service-proxy';
import { Resource } from '@dxos/context';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import type { DedicatedWorkerInitMessage } from './types';
import { log } from '@dxos/log';

export class DedicatedWorkerClientServices extends Resource implements ClientServicesProvider {
  #services!: ClientServicesProxy;
  #createWorker: () => Worker;
  #worker?: Worker;

  readonly closed = new Event<Error | undefined>();

  constructor(createWorker: () => Worker) {
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
        this.#worker!.onerror = (e) => reject(e.error);
      },
    );
    log('got worker ports');
    void navigator.locks.request(livenessLockKey, () => {
      log('worker terminated');
      if (this.isOpen) {
        this.closed.emit(new Error('Dedicated worker terminated.'));
      }
    });
    this.#services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
    await this.#services.open();
  }

  override async _close(): Promise<void> {
    await this.#services.close();
    this.#worker?.terminate();
  }
}
