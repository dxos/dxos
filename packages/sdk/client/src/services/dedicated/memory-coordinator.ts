//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';

import type { WorkerCoordinator, WorkerCoordinatorMessage } from './types';

export class MemoryWorkerCoordiantor implements WorkerCoordinator {
  readonly onMessage = new Event<WorkerCoordinatorMessage>();

  sendMessage(message: WorkerCoordinatorMessage): void {
    log('memory coordinator got message', { type: message.type });
    setTimeout(() => this.onMessage.emit(message));
  }
}
