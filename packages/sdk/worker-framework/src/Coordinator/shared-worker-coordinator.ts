//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';

import * as WorkerProtocol from '../WorkerProtocol';

// The DOM `SharedWorker` global, referenced through `globalThis` because the exported class below
// shadows the bare `SharedWorker` name within this module.
type SharedWorkerGlobal = InstanceType<typeof globalThis.SharedWorker>;

export type SharedWorkerOptions = {
  createWorker: () => SharedWorkerGlobal;
};

export class SharedWorker implements WorkerProtocol.WorkerCoordinator {
  // SharedWorker lifecycle is managed by the browser, we don't need to terminate it.
  readonly #worker: SharedWorkerGlobal;

  constructor(options: SharedWorkerOptions) {
    this.#worker = options.createWorker();
    this.#worker.onerror = (event: ErrorEvent) => {
      log.error('coordinator worker error', { error: event.error });
    };
    this.#worker.port.onmessage = (event: MessageEvent<WorkerProtocol.CoordinatorMessage>) => {
      this.onMessage.emit(event.data);
    };
    this.#worker.port.onmessageerror = (event: MessageEvent) => {
      log.error('coordinator worker port message error', { error: event.data });
    };
    this.#worker.port.start();
  }

  readonly onMessage = new Event<WorkerProtocol.CoordinatorMessage>();

  sendMessage(message: WorkerProtocol.CoordinatorMessage): void {
    switch (message.type) {
      case 'provide-port':
        this.#worker.port.postMessage(message, {
          transfer: [message.appPort, message.systemPort],
        });
        break;
      default:
        this.#worker.port.postMessage(message);
        break;
    }
  }
}
