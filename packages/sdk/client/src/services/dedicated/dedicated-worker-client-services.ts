//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';

import { AsyncTask, Event, Trigger, asyncTimeout } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type { ServiceBundle } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import type { MaybePromise } from '@dxos/util';

import { ClientServicesProxy } from '../service-proxy';
import { SharedWorkerConnection } from '../shared-worker-connection';
import {
  type DedicatedWorkerMessage,
  type DedicatedWorkerReadyMessage,
  type WorkerCoordinator,
  type WorkerCoordinatorMessage,
  type WorkerOrPort,
} from './types';

export const LEADER_LOCK_KEY = '@dxos/client/DedicatedWorkerClientServices/LeaderLock';

/** Max time to wait for a Web Lock or coordinator/worker RPC reply during dedicated-worker connect. */
const LOCK_OR_RPC_WAIT_TIMEOUT = 15_000;

const lockOrRpcTimeoutError = (operation: string, timeout = LOCK_OR_RPC_WAIT_TIMEOUT): Error =>
  new Error(`Dedicated worker client services timed out after ${timeout}ms: ${operation}.`);

const waitWithLockOrRpcTimeout = <T>(promise: Promise<T>, operation: string): Promise<T> =>
  asyncTimeout(promise, LOCK_OR_RPC_WAIT_TIMEOUT, lockOrRpcTimeoutError(operation));

const DEFAULT_LEADER_HEARTBEAT_INTERVAL = 1_000;
// ~5 missed heartbeats: tolerant of main-thread jank (GC pauses, heavy renders) on the leader tab,
// since the heartbeat runs on the leader's main thread while data work runs in the worker.
const DEFAULT_LEADER_STALE_TIMEOUT = 5_000;
const DEFAULT_LEADER_PORT_TIMEOUT = LOCK_OR_RPC_WAIT_TIMEOUT;

// Sentinel resolved when a follower gives up waiting for a port from the leader.
const LEADER_TIMEOUT = Symbol('leader-timeout');

export interface LeaderTimeoutOptions {
  /**
   * Interval at which a leader broadcasts liveness heartbeats while holding the lock.
   */
  heartbeatInterval?: number;
  /**
   * Duration without a heartbeat after which a lock-holding leader is considered stale
   * and its lock may be stolen to force re-election.
   */
  staleTimeout?: number;
  /**
   * Duration a follower waits for a port from the leader before re-evaluating leadership.
   */
  portTimeout?: number;
}

export interface DedeciatedWorkerClientServicesOptions {
  createWorker: () => WorkerOrPort;
  createCoordinator: () => MaybePromise<WorkerCoordinator>;
  /**
   * Config to pass to the dedicated worker.
   */
  config?: Config;
  /**
   * Overrides for leader liveness/steal timeouts. Defaults are tuned for production; tests pass
   * small values for determinism.
   */
  leaderTimeouts?: LeaderTimeoutOptions;
}

/**
 * Runs services in a dedicated worker, exposed to other tabs.
 * Leader election is used to ensure only a single worker is running.
 */
export class DedicatedWorkerClientServices extends Resource implements ClientServicesProvider {
  #createWorker: () => WorkerOrPort;
  #createCoordinator: () => MaybePromise<WorkerCoordinator>;
  #config: Config | undefined;
  #services: ClientServicesProxy | undefined = undefined;
  #leaderSession: LeaderSession | undefined = undefined;
  #coordinator: WorkerCoordinator | undefined = undefined;
  #connection: SharedWorkerConnection | undefined = undefined;
  readonly #clientId = `dedicated-worker-client-services-${crypto.randomUUID()}`;

  readonly #leaderHeartbeatInterval: number;
  readonly #leaderStaleTimeout: number;
  readonly #leaderPortTimeout: number;
  // Timestamp (ms) of the last heartbeat seen from any leader; 0 if none observed yet.
  #lastLeaderHeartbeat = 0;
  // Timestamp (ms) of the last steal attempt; gates against thrashing re-election.
  #lastStealAttempt = 0;
  // Resolves the leader-lock hold; woken on close, worker termination, or when our lock is stolen.
  #leaderDone: Trigger | undefined;

  #initialConnection = new Trigger<void>();
  #isInitialConnection = true;
  #reconnectCallbacks: Array<() => Promise<void>> = [];

  readonly closed = new Event<Error | undefined>();
  readonly reconnected = new Event<void>();

  onReconnect = (callback: () => Promise<void>) => {
    this.#reconnectCallbacks.push(callback);
  };

  constructor(options: DedeciatedWorkerClientServicesOptions) {
    super();
    this.#createWorker = options.createWorker;
    this.#createCoordinator = options.createCoordinator;
    this.#config = options.config;
    this.#leaderHeartbeatInterval = options.leaderTimeouts?.heartbeatInterval ?? DEFAULT_LEADER_HEARTBEAT_INTERVAL;
    this.#leaderStaleTimeout = options.leaderTimeouts?.staleTimeout ?? DEFAULT_LEADER_STALE_TIMEOUT;
    this.#leaderPortTimeout = options.leaderTimeouts?.portTimeout ?? DEFAULT_LEADER_PORT_TIMEOUT;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get rpc() {
    invariant(this.#services, 'services not initialized');
    return this.#services.rpc;
  }

  get services(): Partial<ClientServices> {
    invariant(this.#services, 'services not initialized');
    return this.#services.services;
  }

  override async _open(): Promise<void> {
    log('dedicated-worker-client-services: opening', { clientId: this.#clientId });
    log('dedicated-worker-client-services: creating coordinator');
    this.#coordinator = await this.#createCoordinator();
    log('dedicated-worker-client-services: coordinator created');
    // Track leader liveness for the lifetime of the resource so the connect task can tell a live
    // leader from a dead one before stealing the lock.
    this.#coordinator.onMessage.on(this._ctx, (message) => {
      if (message.type === 'leader-heartbeat') {
        this.#lastLeaderHeartbeat = Date.now();
      }
    });
    this.#watchLeader();
    log('dedicated-worker-client-services: leader watch started');
    this.#connectTask.open();
    log('dedicated-worker-client-services: running initial connect task');
    await waitWithLockOrRpcTimeout(this.#connectTask.runBlocking(), 'running dedicated worker initial connect task');
    log('dedicated-worker-client-services: initial connect task returned, awaiting initial connection');
    await waitWithLockOrRpcTimeout(this.#initialConnection.wait(), 'establishing initial dedicated worker connection');
    log('dedicated-worker-client-services: initial connection established');
  }

  override async _close(): Promise<void> {
    log('dedicated-worker-client-services: closing');
    await this.#connectTask.close();
    log('dedicated-worker-client-services: connect task closed');
    await this.#services?.close();
    log('dedicated-worker-client-services: services proxy closed');
    await this.#connection?.close();
    log('dedicated-worker-client-services: shared worker connection closed');
    await this.#leaderSession?.close();
    log('dedicated-worker-client-services: leader session closed');
  }

  /**
   * Waits until this client becomes a leader and starts the worker.
   */
  #watchLeader() {
    queueMicrotask(async () => {
      try {
        log('dedicated-worker-client-services: requesting leader lock', { clientId: this.#clientId });
        await requestExclusiveLockWithTimeout(
          LEADER_LOCK_KEY,
          'acquiring dedicated worker leader lock',
          this._ctx.signal,
          async () => {
            // I am the leader now.
            log('dedicated-worker-client-services: leader lock acquired (this tab is leader)', {
              clientId: this.#clientId,
            });
            invariant(this.#coordinator);
            invariant(!this.#leaderSession);

            // Heartbeat for the full duration we hold the lock (starting before the worker is ready)
            // so followers can distinguish a live, slow-to-start leader from a dead one and avoid
            // stealing the lock from a healthy leader.
            const sendHeartbeat = () =>
              this.#coordinator?.sendMessage({ type: 'leader-heartbeat', leaderId: this.#clientId });
            sendHeartbeat();
            const heartbeat = setInterval(sendHeartbeat, this.#leaderHeartbeatInterval);

            this.#leaderSession = new LeaderSession(
              this.#createWorker,
              this.#coordinator,
              this.#config,
              this.#clientId,
            );
            const done = new Trigger();
            this.#leaderDone = done;
            this._ctx.onDispose(() => done.wake());
            this.#leaderSession.onClose.on((error) => {
              log('dedicated-worker-client-services: leader session closed', { hasError: !!error });
              this.#leaderSession = undefined;
              if (error) {
                done.throw(error);
              } else {
                done.wake();
              }
            });
            try {
              log('dedicated-worker-client-services: opening leader session');
              await waitWithLockOrRpcTimeout(this.#leaderSession.open(), 'opening dedicated worker leader session');
              log('dedicated-worker-client-services: leader session opened');
              await done.wait(); // Hold until the leader session is closed.
              log('dedicated-worker-client-services: leader session done');
            } finally {
              clearInterval(heartbeat);
              this.#leaderDone = undefined;
            }
          },
        );
        log('dedicated-worker-client-services: leader lock released');
      } catch (error: any) {
        if (isAbortError(error)) {
          if (this._ctx.disposed) {
            // Normal shutdown: the leader-lock request was aborted because the resource is closing.
            log('dedicated-worker-client-services: leader watch aborted (closing)');
            return;
          }
          // Our exclusive lock was stolen by another tab that judged this leader stale. The lock
          // callback keeps running per spec, so explicitly tear down our leader session (terminating
          // the worker so it stops contending for shared storage) and re-enter the election.
          log.warn('dedicated-worker-client-services: leader lock stolen, tearing down and re-watching', {
            clientId: this.#clientId,
          });
          this.#leaderDone?.wake();
          const session = this.#leaderSession;
          this.#leaderSession = undefined;
          await session?.close();
          this.#watchLeader();
          return;
        }
        log.catch(error);
      }
    });
  }

  #connectTask = new AsyncTask(async () => {
    const ctx = this._ctx.derive();

    const handleLeaderStopped = async () => {
      log('lost connection');

      // Schedule reconnect immediately, then cleanup in background.
      this.#connectTask?.schedule();

      // Close old services/connection.
      await ctx.dispose();
      const oldServices = this.#services;
      const oldConnection = this.#connection;
      this.#services = undefined;
      this.#connection = undefined;
      await oldServices?.close();
      await oldConnection?.close();
    };

    try {
      log('trying to connect', { clientId: this.#clientId });
      log('dedicated-worker-client-services: requesting port from leader (waiting for provide-port)');
      const result = await new Promise<(WorkerCoordinatorMessage & { type: 'provide-port' }) | typeof LEADER_TIMEOUT>(
        (resolve) => {
          invariant(this.#coordinator);

          const unsubscribe = this.#coordinator.onMessage.on((message) => {
            if (message.type === 'provide-port' && message.clientId === this.#clientId) {
              log('dedicated-worker-client-services: received provide-port from leader', {
                leaderId: message.leaderId,
              });
              unsubscribe();
              resolve(message);
            } else if (message.type === 'new-leader') {
              log('dedicated-worker-client-services: new leader announced, requesting port', {
                leaderId: message.leaderId,
              });
              // New leader announced, request a port from them.
              this.#coordinator?.sendMessage({
                type: 'request-port',
                clientId: this.#clientId,
              });
            }
          });

          // Re-evaluate leadership if no port arrives; an unbounded wait would hang the tab behind a
          // dead leader that still holds the lock (e.g. a frozen/zombie tab).
          const timer = setTimeout(() => {
            unsubscribe();
            resolve(LEADER_TIMEOUT);
          }, this.#leaderPortTimeout);
          ctx.onDispose(() => clearTimeout(timer));

          // Send initial request in case leader is already ready.
          this.#coordinator.sendMessage({
            type: 'request-port',
            clientId: this.#clientId,
          });
        },
      );

      if (result === LEADER_TIMEOUT) {
        log.warn(
          lockOrRpcTimeoutError('waiting for dedicated worker provide-port RPC reply', this.#leaderPortTimeout).message,
          {
            clientId: this.#clientId,
          },
        );
        await this.#maybeStealStaleLeader();
        // Retry the connect; a fresh leader (this tab or another) is now being elected.
        this.#connectTask.schedule();
        return;
      }

      const { appPort, systemPort, leaderId, livenessLockKey } = result;
      log('connected to worker', { leaderId });

      queueMicrotask(async () => {
        try {
          await navigator.locks.request(livenessLockKey, { mode: 'exclusive', signal: ctx.signal }, async () => {
            await handleLeaderStopped();
          });
        } catch (err: any) {
          if (isAbortError(err)) {
            return;
          }
          log.catch(err);
        }
      });
      this.#coordinator!.onMessage.on(ctx, async (msg) => {
        if (msg.type === 'new-leader' && msg.leaderId !== leaderId) {
          await handleLeaderStopped();
        }
      });

      this.#connection = new SharedWorkerConnection({
        // TODO(dmaretskyi): Config management.
        config: this.#config ?? new Config(),
        systemPort: createWorkerPort({ port: systemPort }),
      });
      log('opening SharedWorkerConnection');
      await waitWithLockOrRpcTimeout(
        this.#connection.open({
          origin: typeof location !== 'undefined' ? location.origin : 'unknown',
        }),
        'opening shared worker connection',
      );
      log('opened SharedWorkerConnection');

      log('dedicated-worker-client-services: opening client services proxy (app port)');
      this.#services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
      await waitWithLockOrRpcTimeout(this.#services.open(), 'opening dedicated worker client services proxy');
      log('dedicated-worker-client-services: client services proxy opened');

      if (this.#isInitialConnection) {
        log('dedicated-worker-client-services: initial connection complete');
        performance.mark('dedicated-worker:session-ready');
        this.#isInitialConnection = false;
        this.#initialConnection.wake();
      } else {
        // Call all reconnection callbacks and wait for them to complete.
        log('reconnecting, calling callbacks', { count: this.#reconnectCallbacks.length });
        await Promise.all(this.#reconnectCallbacks.map((cb) => cb()));
        log('reconnected');
        this.reconnected.emit();
      }
    } catch (err: any) {
      log.warn('dedicated-worker-client-services: connect task failed, will reschedule', { err });
      this.#initialConnection.throw(err);
      log.catch(err);
      void ctx.dispose();
      this.#connectTask?.schedule();
    }
  });

  /**
   * Steal the leader lock when the current holder is unresponsive and shows no sign of life.
   * The stolen holder's lock request rejects in its own context; releasing immediately lets queued
   * requests (including this tab's own leader watcher) re-elect a healthy leader. This is safe
   * because shared state lives behind the dedicated worker, not behind the lock itself.
   */
  async #maybeStealStaleLeader(): Promise<void> {
    const sinceHeartbeat = Date.now() - this.#lastLeaderHeartbeat;
    if (sinceHeartbeat < this.#leaderStaleTimeout) {
      // A leader is alive (it heartbeats while holding the lock); it may just be slow to start.
      log('dedicated-worker-client-services: leader unresponsive but alive, not stealing', { sinceHeartbeat });
      return;
    }

    if (!(await this.#isLeaderLockHeld())) {
      // No leader holds the lock; a normal election will elect one (this tab's watcher is queued).
      log('dedicated-worker-client-services: no leader holds the lock, awaiting election');
      return;
    }

    if (Date.now() - this.#lastStealAttempt < this.#leaderStaleTimeout) {
      // Avoid thrashing: at most one steal per stale window.
      log('dedicated-worker-client-services: steal on cooldown, awaiting re-election');
      return;
    }
    this.#lastStealAttempt = Date.now();

    log.warn('dedicated-worker-client-services: stealing stale leader lock', {
      clientId: this.#clientId,
      sinceHeartbeat,
    });
    try {
      await waitWithLockOrRpcTimeout(
        navigator.locks.request(LEADER_LOCK_KEY, { steal: true }, async () => {
          log.warn('dedicated-worker-client-services: stole stale leader lock, re-electing');
        }),
        'stealing stale dedicated worker leader lock',
      );
    } catch (error: any) {
      log.catch(error);
    }
  }

  async #isLeaderLockHeld(): Promise<boolean> {
    try {
      const { held } = await navigator.locks.query();
      return (held ?? []).some((lock) => lock.name === LEADER_LOCK_KEY);
    } catch {
      // If querying is unsupported, fall back to attempting the steal (gated by the heartbeat check).
      return true;
    }
  }
}

/**
 * Represents a tab becoming a leader and running the worker.
 */
class LeaderSession extends Resource {
  #createWorker: () => WorkerOrPort;
  #coordinator: WorkerCoordinator;
  #config: Config | undefined;
  #worker!: WorkerOrPort;
  #leaderId = `leader-${crypto.randomUUID()}`;
  #ownerClientId: string;

  constructor(
    createWorker: () => WorkerOrPort,
    coordinator: WorkerCoordinator,
    config: Config | undefined,
    ownerClientId: string,
  ) {
    super();
    this.#createWorker = createWorker;
    this.#coordinator = coordinator;
    this.#config = config;
    this.#ownerClientId = ownerClientId;
  }

  readonly onClose = new Event<Error | undefined>();

  protected override async _open(_ctx: Context): Promise<void> {
    log('creating worker');
    this.#worker = this.#createWorker();
    performance.mark('dedicated-worker:spawned');
    const listening = new Trigger();
    const ready = new Trigger<DedicatedWorkerReadyMessage>();
    this.#worker!.onmessage = (event: MessageEvent<DedicatedWorkerMessage>) => {
      log('leader got message', { type: event.data.type });
      switch (event.data.type) {
        case 'listening':
          listening.wake();
          break;
        case 'ready':
          ready.wake(event.data);
          break;
        case 'session':
          this.#coordinator.sendMessage({
            type: 'provide-port',
            appPort: event.data.appPort,
            systemPort: event.data.systemPort,
            clientId: event.data.clientId,
            leaderId: this.#leaderId,
            livenessLockKey,
          });
          break;
        default:
          log.error('unknown message', { type: event.data });
      }
    };
    if (isWorker(this.#worker)) {
      this.#worker.onerror = (e) => {
        ready.throw(e.error);
        listening.throw(e.error);
      };
    }

    log('waiting for worker to start listening');
    await waitWithLockOrRpcTimeout(listening.wait(), 'waiting for dedicated worker to start listening');
    log('worker is listening, sending init message', { leaderId: this.#leaderId });
    this.#sendMessage({
      type: 'init',
      clientId: this.#leaderId,
      ownerClientId: this.#ownerClientId,
      config: this.#config?.values,
    });
    log('waiting for worker to be ready');
    const { livenessLockKey } = await waitWithLockOrRpcTimeout(
      ready.wait(),
      'waiting for dedicated worker ready RPC reply',
    );
    log('leader ready', { leaderId: this.#leaderId });

    // Listen for worker termination.
    void navigator.locks.request(livenessLockKey, () => {
      log('worker terminated');
      if (this.isOpen) {
        this.onClose.emit(new Error('Dedicated worker terminated.'));
      }
    });

    this.#coordinator.onMessage.on(this._ctx, (msg) => {
      switch (msg.type) {
        case 'new-leader':
          if (msg.leaderId !== this.#leaderId) {
            log.warn('new leader elected while we think we are the leader', {
              newLeaderId: msg.leaderId,
              ourLeaderId: this.#leaderId,
            });
          }
          break;
        case 'provide-port':
          // noop
          break;
        case 'leader-heartbeat':
          // Broadcast by leaders (including ourselves) for follower liveness tracking; ignore here.
          break;
        case 'request-port':
          this.#sendMessage({ type: 'start-session', clientId: msg.clientId });
          break;
        default:
          log.error('unknown message', { type: msg });
      }
    });
    this.#coordinator.sendMessage({
      type: 'new-leader',
      leaderId: this.#leaderId,
    });
  }

  protected override async _close(): Promise<void> {
    log('leader-session: closing', { leaderId: this.#leaderId });
    if (isWorker(this.#worker)) {
      this.#worker?.terminate();
    } else if (this.#worker instanceof MessagePort) {
      this.#worker.close();
    }
    log('leader-session: closed');
  }

  #sendMessage(msg: DedicatedWorkerMessage) {
    this.#worker.postMessage(msg);
  }
}

const isWorker = (worker: WorkerOrPort): worker is Worker => {
  return typeof Worker !== 'undefined' && worker instanceof Worker;
};

const isAbortError = (error: Error) => {
  return error.name === 'AbortError';
};

const mergeAbortSignals = (signals: AbortSignal[]): AbortSignal => {
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }

  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
};

/**
 * Times out only lock acquisition; once the callback runs, the caller may hold the lock indefinitely.
 */
const requestExclusiveLockWithTimeout = async (
  name: string,
  operation: string,
  ctxSignal: AbortSignal,
  callback: () => Promise<void>,
): Promise<void> => {
  const acquisitionTimedOut = new AbortController();
  const timeoutId = setTimeout(() => acquisitionTimedOut.abort(), LOCK_OR_RPC_WAIT_TIMEOUT);
  let acquired = false;

  try {
    await navigator.locks.request(
      name,
      { mode: 'exclusive', signal: mergeAbortSignals([ctxSignal, acquisitionTimedOut.signal]) },
      async () => {
        acquired = true;
        clearTimeout(timeoutId);
        await callback();
      },
    );
  } catch (error: any) {
    if (!acquired && acquisitionTimedOut.signal.aborted && !ctxSignal.aborted) {
      throw lockOrRpcTimeoutError(operation);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

Cause.interrupt;
