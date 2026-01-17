import type { MaybePromise } from '@dxos/util';
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
}

/**
 * Worker -> Leader Client to notify that worker is ready.
 * Automatically initializes the first session.
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
    };

export type WorkerOrPort = Worker | MessagePort;

/**
 * Coordinator exchange ports and notify about a new leader.
 */
export interface WorkerCoordinator {
  readonly onMessage: Event<WorkerCoordinatorMessage>;
  sendMessage(message: WorkerCoordinatorMessage): void;
}
