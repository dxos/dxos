//
// Copyright 2026 DXOS.org
//

import type { Event } from '@dxos/async';

/**
 * Worker -> Leader Client to notify that worker is listening for messages.
 */
export interface DedicatedWorkerListeningMessage {
  type: 'listening';
}

/**
 * Leader Client -> Worker to start the worker.
 */
export interface DedicatedWorkerInitMessage {
  type: 'init';
  /**
   * Client that is starting the worker.
   */
  clientId: string;
  /**
   * Client ID that should receive the privileged session (e.g. WebRTC bridge).
   * This is the actual client ID used for session requests.
   */
  ownerClientId?: string;
  /**
   * Config values to initialize the worker with.
   */
  config?: Record<string, any>;
}

/**
 * Worker -> Leader Client to notify that worker is ready.
 */
export interface DedicatedWorkerReadyMessage {
  type: 'ready';

  /**
   * Released if worker is terminated.
   */
  livenessLockKey: string;
}

/**
 * Any Client -> Worker to start a session.
 */
export interface DedicatedWorkerStartSessionMessage {
  type: 'start-session';
  clientId: string;
}

/**
 * Worker -> Any Client to start a session.
 */
export interface DedicatedWorkerSessionMessage {
  type: 'session';
  clientId: string;
  appPort: MessagePort;
  systemPort: MessagePort;
  isOwner: boolean;
}

export type DedicatedWorkerMessage =
  | DedicatedWorkerListeningMessage
  | DedicatedWorkerInitMessage
  | DedicatedWorkerReadyMessage
  | DedicatedWorkerStartSessionMessage
  | DedicatedWorkerSessionMessage;

export type WorkerCoordinatorMessage =
  | {
      type: 'new-leader';
      leaderId: string;
    }
  | {
      // Broadcast by a leader while it holds the leader lock so followers can distinguish a live
      // (possibly slow-to-start) leader from a dead one before deciding to steal the lock.
      type: 'leader-heartbeat';
      leaderId: string;
    }
  | {
      type: 'request-port';
      clientId: string;
    }
  | {
      type: 'provide-port';
      leaderId: string;
      clientId: string;
      appPort: MessagePort;
      systemPort: MessagePort;
      livenessLockKey: string;
      isOwner: boolean;
    };

export type WorkerOrPort = Worker | MessagePort;

/**
 * Endpoint for worker-side message handling (DedicatedWorker global or a MessagePort in tests).
 */
export interface WorkerEndpoint {
  postMessage(message: DedicatedWorkerMessage, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (ev: MessageEvent<DedicatedWorkerMessage>) => void): void;
  removeEventListener(type: 'message', listener: (ev: MessageEvent<DedicatedWorkerMessage>) => void): void;
  close?(): void;
}

/**
 * Coordinator exchange ports and notify about a new leader.
 */
export interface WorkerCoordinator {
  readonly onMessage: Event<WorkerCoordinatorMessage>;
  sendMessage(message: WorkerCoordinatorMessage): void;
}
