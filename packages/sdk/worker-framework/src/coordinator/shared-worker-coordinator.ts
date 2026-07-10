//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';

import type { WorkerCoordinator, WorkerCoordinatorMessage } from '../internal/messages';

export type SharedWorkerCoordinatorOptions = {
  createWorker: () => SharedWorker;
};

export class SharedWorkerCoordinator implements WorkerCoordinator {
  // SharedWorker lifecycle is managed by the browser, we don't need to terminate it.
  readonly #worker: SharedWorker;

  constructor(options: SharedWorkerCoordinatorOptions) {
    this.#worker = options.createWorker();
    this.#worker.port.onmessage = (event: MessageEvent<WorkerCoordinatorMessage>) => {
      this.onMessage.emit(event.data);
    };
    this.#worker.port.start();
  }

  readonly onMessage = new Event<WorkerCoordinatorMessage>();

  sendMessage(message: WorkerCoordinatorMessage): void {
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
