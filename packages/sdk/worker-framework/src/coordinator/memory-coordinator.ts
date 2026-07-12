//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';

import * as Messages from '../Messages';

export class Memory implements Messages.WorkerCoordinator {
  readonly onMessage = new Event<Messages.CoordinatorMessage>();

  sendMessage(message: Messages.CoordinatorMessage): void {
    log('memory coordinator got message', { type: message.type });
    setTimeout(() => this.onMessage.emit(message));
  }
}
