//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';

import * as WorkerProtocol from '../WorkerProtocol';

export class Memory implements WorkerProtocol.WorkerCoordinator {
  readonly onMessage = new Event<WorkerProtocol.CoordinatorMessage>();

  sendMessage(message: WorkerProtocol.CoordinatorMessage): void {
    log('memory coordinator got message', { type: message.type });
    setTimeout(() => this.onMessage.emit(message));
  }
}
