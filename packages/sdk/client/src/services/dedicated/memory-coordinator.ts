import { log } from '@dxos/log';
import type { WorkerCoordinator, WorkerCoordinatorMessage } from './types';
import { Event } from '@dxos/async';

export class MemoryWorkerCoordiantor implements WorkerCoordinator {
  readonly onMessage = new Event<WorkerCoordinatorMessage>();

  sendMessage(message: WorkerCoordinatorMessage): void {
    log.info('memory coordinator got message', { type: message.type });
    this.onMessage.emit(message);
  }
}
