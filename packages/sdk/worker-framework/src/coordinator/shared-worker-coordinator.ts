//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';

import type { WorkerCoordinator, WorkerCoordinatorMessage } from '../internal/messages';

export type SharedWorkerCoordinatorOptions = {
  createWorker: () => SharedWorker;
};

export class SharedWorkerCoordinator implements WorkerCoordinator {
  // SharedWorker lifecycle is managed by the browser, we don't need to terminate it.
  readonly #worker: SharedWorker;

  constructor(options: SharedWorkerCoordinatorOptions) {
    this.#worker = options.createWorker();
    log('shared-worker-coordinator: created');
    this.#worker.port.onmessage = (event: MessageEvent<WorkerCoordinatorMessage>) => {
      log('shared-worker-coordinator: received', { type: event.data.type });
      this.onMessage.emit(event.data);
    };
    this.#worker.port.start();
  }

  readonly onMessage = new Event<WorkerCoordinatorMessage>();

  sendMessage(message: WorkerCoordinatorMessage): void {
    log('shared-worker-coordinator: sending', { type: message.type });
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
