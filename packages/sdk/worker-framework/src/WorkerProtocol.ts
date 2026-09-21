//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

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

  /**
   * Identifies this worker on the displacement channel, so its tab can tell an escalation raised
   * against another worker from one this worker raised itself.
   */
  workerId: string;

  /**
   * Displacement channel for this worker's storage lock. The tab listens on it for the escalation a
   * newer worker raises when this one ignores the cooperative stop signal.
   */
  displaceChannel: string;
}

/**
 * Leader Client -> Worker to ask whether the worker is still servicing its event loop, which is what
 * separates the wedged incumbent from every other worker on a storage lock when one is displaced.
 */
export interface DedicatedWorkerPingMessage {
  type: 'ping';
  /** Echoed back, so a reply to a superseded probe cannot answer the current one. */
  nonce: string;
}

/**
 * Worker -> Leader Client in reply to {@link DedicatedWorkerPingMessage}.
 */
export interface DedicatedWorkerPongMessage {
  type: 'pong';
  nonce: string;
}

/**
 * Worker -> Leader Client when the runtime failed to start; the worker shuts down after sending it.
 */
export interface DedicatedWorkerInitFailedMessage {
  type: 'init-failed';
  error: SerializedError;
}

/**
 * Any Client -> Worker to start a session.
 */
export interface DedicatedWorkerStartSessionMessage {
  type: 'start-session';
  clientId: string;
  /**
   * Monotonic per-client connect attempt, forwarded from `request-port`. Distinguishes a raced
   * duplicate of the current attempt (ignored) from a genuine reconnect after a failed one
   * (supersedes it). Absent from a client that predates the field: the worker then treats every
   * request as the first attempt, i.e. first-wins.
   */
  attempt?: number;
  /**
   * Web Lock the tab holds for this connect attempt. The worker ends the session when it releases,
   * i.e. when the tab closed the connection or died. Absent from a client that predates the field:
   * that session then ends only when superseded or on worker shutdown.
   */
  sessionLockKey?: string;
}

/**
 * Worker -> Any Client to start a session.
 */
export interface DedicatedWorkerSessionMessage {
  type: 'session';
  clientId: string;
  /** The connect attempt this session serves, echoed from `start-session`; absent from a worker that predates it. */
  attempt?: number;
  /** Client → worker RPC channel (tab runs the client, worker runs the server). */
  clientToWorker: MessagePort;
  /** Worker → client RPC channel (worker runs the client, tab runs the server). */
  workerToClient: MessagePort;
  isOwner: boolean;
}

/**
 * Worker -> Leader Client when a session whose ports were already handed out could not be built;
 * the tab holding those ports would otherwise only learn of it from its handshake timeout.
 */
export interface DedicatedWorkerSessionFailedMessage {
  type: 'session-failed';
  clientId: string;
  attempt?: number;
  error: SerializedError;
}

export type DedicatedWorkerMessage =
  | DedicatedWorkerListeningMessage
  | DedicatedWorkerInitMessage
  | DedicatedWorkerReadyMessage
  | DedicatedWorkerPingMessage
  | DedicatedWorkerPongMessage
  | DedicatedWorkerInitFailedMessage
  | DedicatedWorkerStartSessionMessage
  | DedicatedWorkerSessionMessage
  | DedicatedWorkerSessionFailedMessage;

export type CoordinatorMessage =
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
      /** See {@link DedicatedWorkerStartSessionMessage.attempt}; the leader forwards it verbatim. */
      attempt?: number;
      /** See {@link DedicatedWorkerStartSessionMessage.sessionLockKey}; the leader forwards it verbatim. */
      sessionLockKey?: string;
    }
  | {
      type: 'provide-port';
      leaderId: string;
      clientId: string;
      /** See {@link DedicatedWorkerSessionMessage.attempt}; a tab ignores a reply for an attempt it abandoned. */
      attempt?: number;
      clientToWorker: MessagePort;
      workerToClient: MessagePort;
      livenessLockKey: string;
      isOwner: boolean;
    }
  | {
      // The session behind an earlier `provide-port` could not be built; see
      // {@link DedicatedWorkerSessionFailedMessage}. Broadcast (it is cloneable), so a coordinator that
      // predates it still delivers it.
      type: 'session-failed';
      clientId: string;
      attempt?: number;
      error: SerializedError;
    };

export type WorkerOrPort = Worker | MessagePort;

/**
 * A worker handle the tab can stop from the outside, releasing every Web Lock the worker held.
 *
 * A bare `MessagePort` is not one: `close()` detaches the channel and leaves `Worker.run` running
 * with its storage and liveness locks, so forced displacement cannot be expressed through it.
 */
export interface TerminableWorker {
  terminate(): void;
}

/** Whether this handle can stand its worker down without the worker's cooperation. */
export const isTerminable = (worker: WorkerOrPort): worker is WorkerOrPort & TerminableWorker =>
  'terminate' in worker && typeof worker.terminate === 'function';

/**
 * Postable form of an error; structured clone drops a custom `name` and, on some engines, the `cause` chain.
 */
export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError;
  /** Present when the error was an `AggregateError`. */
  errors?: SerializedError[];
}

export const encodeError = (error: unknown): SerializedError => {
  // Guards against cycles only: an error may appear twice in the tree, e.g. as a cause and an aggregated error.
  const encode = (value: unknown, ancestors: ReadonlySet<unknown>): SerializedError => {
    if (!(value instanceof Error)) {
      return { name: 'Error', message: String(value) };
    }
    const path = new Set(ancestors).add(value);
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause === undefined || path.has(value.cause) ? undefined : encode(value.cause, path),
      errors:
        value instanceof AggregateError
          ? value.errors.map((inner) => (path.has(inner) ? { name: 'Error', message: '<cycle>' } : encode(inner, path)))
          : undefined,
    };
  };
  return encode(error, new Set());
};

export const decodeError = ({ name, message, stack, cause, errors }: SerializedError): Error => {
  const options = cause ? { cause: decodeError(cause) } : undefined;
  const error = errors
    ? new AggregateError(
        errors.map((inner) => decodeError(inner)),
        message,
        options,
      )
    : new Error(message, options);
  error.name = name;
  if (stack !== undefined) {
    error.stack = stack;
  }
  return error;
};

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
  readonly onMessage: Event<CoordinatorMessage>;
  /**
   * Fires when the link itself has failed, e.g. the coordinator worker's script did not load. Nothing
   * sent or awaited on this coordinator will complete afterwards.
   */
  readonly onError?: Event<Error>;
  sendMessage(message: CoordinatorMessage): void;
}
