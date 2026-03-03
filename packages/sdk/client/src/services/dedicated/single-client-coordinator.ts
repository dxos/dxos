//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';

import type { WorkerCoordinator, WorkerCoordinatorMessage } from './types';

/**
 * Coordinator for single-client mode (mobile apps).
 * Routes messages locally without SharedWorker.
 */
// NOTE: Both SharedWorkers and ServiceWorkers have severe limitations in WebViews:
// - SharedWorkers crash on iOS WKWebView (Apple Bug FB11723920).
// - ServiceWorkers require HTTP/HTTPS origins and cannot be used with custom URL schemes.
// TODO(wittjosiah): To support multiple windows on mobile platforms, implement coordinator in the Tauri Rust backend.
export class SingleClientCoordinator implements WorkerCoordinator {
  readonly onMessage = new Event<WorkerCoordinatorMessage>();

  sendMessage(message: WorkerCoordinatorMessage): void {
    // Echo messages back to self (single client, no cross-tab needed).
    queueMicrotask(() => this.onMessage.emit(message));
  }
}
