import { Event } from '@dxos/async';
import type { WorkerCoordinator, WorkerCoordinatorMessage } from './types';

// `#coordinator-worker` resolves via package.json imports to a module in this package.
// I'm not convincied this has good bundler support, so I'm leaving an escape hatch for now.
const defaultCreateWorker = () =>
  new SharedWorker(new URL('#coordinator-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-coordinator-worker',
  });

export class SharedWorkerCoordinator implements WorkerCoordinator {
  // SharedWorker lifecycles is managed by the browser, we don't need to terminate it.
  #worker: SharedWorker;

  constructor(createWorker: () => SharedWorker = defaultCreateWorker) {
    this.#worker = createWorker();
    this.#worker.port.onmessage = (event: MessageEvent<WorkerCoordinatorMessage>) => {
      this.onMessage.emit(event.data);
    };
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
