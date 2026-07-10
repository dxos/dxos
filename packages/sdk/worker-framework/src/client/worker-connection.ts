//
// Copyright 2026 DXOS.org
//

import { AsyncTask, Event, Trigger } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type { MaybePromise } from '@dxos/util';

import { isAbortError, requestExclusiveLockWithTimeout, waitWithLockOrRpcTimeout } from '../internal/locks';
import type {
  DedicatedWorkerMessage,
  WorkerCoordinator,
  WorkerCoordinatorMessage,
  WorkerOrPort,
} from '../internal/messages';

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

export type WorkerConnectionHandle = {
  close(): Promise<void>;
};

export type WorkerConnectionOptions = {
  createWorker: () => WorkerOrPort;
  createCoordinator: () => MaybePromise<WorkerCoordinator>;
  leaderLockKey: string;
  config?: Record<string, any>;
  leaderTimeouts?: LeaderTimeoutOptions;
  onConnect: (args: {
    appPort: MessagePort;
    systemPort: MessagePort;
    leaderId: string;
    livenessLockKey: string;
    isOwner: boolean;
  }) => Promise<WorkerConnectionHandle>;
};

const DEFAULT_LEADER_HEARTBEAT_INTERVAL = 1_000;
// ~5 missed heartbeats: tolerant of main-thread jank (GC pauses, heavy renders) on the leader tab,
// since the heartbeat runs on the leader's main thread while data work runs in the worker.
const DEFAULT_LEADER_STALE_TIMEOUT = 5_000;
const DEFAULT_LEADER_PORT_TIMEOUT = 15_000;

/**
 * Manages leader election, coordinator port exchange, and worker lifecycle for dedicated workers.
 * Service-specific wiring is injected via {@link WorkerConnectionOptions.onConnect}.
 */
export class WorkerConnection extends Resource {
  readonly #createWorker: () => WorkerOrPort;
  readonly #createCoordinator: () => MaybePromise<WorkerCoordinator>;
  readonly #leaderLockKey: string;
  readonly #config: Record<string, any> | undefined;
  readonly #onConnect: WorkerConnectionOptions['onConnect'];
  readonly #clientId = `worker-connection-${crypto.randomUUID()}`;

  readonly #leaderHeartbeatInterval: number;
  readonly #leaderStaleTimeout: number;
  readonly #leaderPortTimeout: number;

  #connectionHandle: WorkerConnectionHandle | undefined;
  #leaderSession: LeaderSession | undefined;
  #coordinator: WorkerCoordinator | undefined;

  // Timestamp (ms) of the last heartbeat seen from any leader; 0 if none observed yet.
  #lastLeaderHeartbeat = 0;
  // Timestamp (ms) of the last steal attempt; gates against thrashing re-election.
  #lastStealAttempt = 0;
  // Resolves the leader-lock hold; woken on close, worker termination, or when our lock is stolen.
  #leaderDone: Trigger | undefined;

  readonly #initialConnection = new Trigger<void>();
  #isInitialConnection = true;
  readonly #reconnectCallbacks: Array<() => Promise<void>> = [];

  readonly closed = new Event<Error | undefined>();
  readonly reconnected = new Event<void>();

  constructor(options: WorkerConnectionOptions) {
    super();
    this.#createWorker = options.createWorker;
    this.#createCoordinator = options.createCoordinator;
    this.#leaderLockKey = options.leaderLockKey;
    this.#config = options.config;
    this.#onConnect = options.onConnect;
    this.#leaderHeartbeatInterval = options.leaderTimeouts?.heartbeatInterval ?? DEFAULT_LEADER_HEARTBEAT_INTERVAL;
    this.#leaderStaleTimeout = options.leaderTimeouts?.staleTimeout ?? DEFAULT_LEADER_STALE_TIMEOUT;
    this.#leaderPortTimeout = options.leaderTimeouts?.portTimeout ?? DEFAULT_LEADER_PORT_TIMEOUT;
  }

  onReconnect = (callback: () => Promise<void>) => {
    this.#reconnectCallbacks.push(callback);
  };

  get clientId(): string {
    return this.#clientId;
  }

  override async _open(): Promise<void> {
    log('worker-connection: opening', { clientId: this.#clientId });
    this.#coordinator = await this.#createCoordinator();
    this.#coordinator.onMessage.on(this._ctx, (message) => {
      if (message.type === 'leader-heartbeat') {
        this.#lastLeaderHeartbeat = Date.now();
      }
    });
    this.#watchLeader();
    this.#connectTask.open();
    await waitWithLockOrRpcTimeout(this.#connectTask.runBlocking(), 'running worker connection initial connect task');
    await waitWithLockOrRpcTimeout(this.#initialConnection.wait(), 'establishing initial worker connection');
    log('worker-connection: initial connection established');
  }

  override async _close(): Promise<void> {
    log('worker-connection: closing');
    await this.#connectTask.close();
    await this.#connectionHandle?.close();
    await this.#leaderSession?.close();
  }

  #watchLeader() {
    queueMicrotask(async () => {
      try {
        log('worker-connection: requesting leader lock', { clientId: this.#clientId });
        await requestExclusiveLockWithTimeout(
          this.#leaderLockKey,
          'acquiring worker leader lock',
          this._ctx.signal,
          async () => {
            log('worker-connection: leader lock acquired (this tab is leader)', { clientId: this.#clientId });
            invariant(this.#coordinator);
            invariant(!this.#leaderSession);

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
              log('worker-connection: leader session closed', { hasError: !!error });
              this.#leaderSession = undefined;
              if (error) {
                done.throw(error);
              } else {
                done.wake();
              }
            });
            try {
              await waitWithLockOrRpcTimeout(this.#leaderSession.open(), 'opening worker leader session');
              await done.wait();
            } finally {
              clearInterval(heartbeat);
              this.#leaderDone = undefined;
            }
          },
        );
        log('worker-connection: leader lock released');
      } catch (error: any) {
        if (isAbortError(error)) {
          if (this._ctx.disposed) {
            log('worker-connection: leader watch aborted (closing)');
            return;
          }
          log.warn('worker-connection: leader lock stolen, tearing down and re-watching', { clientId: this.#clientId });
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
      log('worker-connection: lost connection');
      this.#connectTask?.schedule();
      await ctx.dispose();
      const oldHandle = this.#connectionHandle;
      this.#connectionHandle = undefined;
      await oldHandle?.close();
    };

    try {
      log('worker-connection: requesting port from leader');
      const result = await new Promise<(WorkerCoordinatorMessage & { type: 'provide-port' }) | typeof LEADER_TIMEOUT>(
        (resolve) => {
          invariant(this.#coordinator);

          const unsubscribe = this.#coordinator.onMessage.on((message) => {
            if (message.type === 'provide-port' && message.clientId === this.#clientId) {
              unsubscribe();
              resolve(message);
            } else if (message.type === 'new-leader') {
              this.#coordinator?.sendMessage({
                type: 'request-port',
                clientId: this.#clientId,
              });
            }
          });

          const timer = setTimeout(() => {
            unsubscribe();
            resolve(LEADER_TIMEOUT);
          }, this.#leaderPortTimeout);
          ctx.onDispose(() => clearTimeout(timer));

          this.#coordinator.sendMessage({
            type: 'request-port',
            clientId: this.#clientId,
          });
        },
      );

      if (result === LEADER_TIMEOUT) {
        log.warn('worker-connection: timed out waiting for provide-port', { clientId: this.#clientId });
        await this.#maybeStealStaleLeader();
        this.#connectTask.schedule();
        return;
      }

      const { appPort, systemPort, leaderId, livenessLockKey, isOwner } = result;
      log('worker-connection: connected to worker', { leaderId, isOwner });

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

      this.#connectionHandle = await waitWithLockOrRpcTimeout(
        this.#onConnect({ appPort, systemPort, leaderId, livenessLockKey, isOwner }),
        'opening worker connection handle',
      );

      if (this.#isInitialConnection) {
        performance.mark('worker-connection:session-ready');
        this.#isInitialConnection = false;
        this.#initialConnection.wake();
      } else {
        log('worker-connection: reconnecting, calling callbacks', { count: this.#reconnectCallbacks.length });
        await Promise.all(this.#reconnectCallbacks.map((cb) => cb()));
        this.reconnected.emit();
      }
    } catch (err: any) {
      log.warn('worker-connection: connect task failed, will reschedule', { err });
      this.#initialConnection.throw(err);
      log.catch(err);
      void ctx.dispose();
      this.#connectTask?.schedule();
    }
  });

  async #maybeStealStaleLeader(): Promise<void> {
    const sinceHeartbeat = Date.now() - this.#lastLeaderHeartbeat;
    if (sinceHeartbeat < this.#leaderStaleTimeout) {
      log('worker-connection: leader unresponsive but alive, not stealing', { sinceHeartbeat });
      return;
    }

    if (!(await this.#isLeaderLockHeld())) {
      log('worker-connection: no leader holds the lock, awaiting election');
      return;
    }

    if (Date.now() - this.#lastStealAttempt < this.#leaderStaleTimeout) {
      log('worker-connection: steal on cooldown, awaiting re-election');
      return;
    }
    this.#lastStealAttempt = Date.now();

    log.warn('worker-connection: stealing stale leader lock', { clientId: this.#clientId, sinceHeartbeat });
    try {
      await waitWithLockOrRpcTimeout(
        navigator.locks.request(this.#leaderLockKey, { steal: true }, async () => {
          log.warn('worker-connection: stole stale leader lock, re-electing');
        }),
        'stealing stale worker leader lock',
      );
    } catch (error: any) {
      log.catch(error);
    }
  }

  async #isLeaderLockHeld(): Promise<boolean> {
    try {
      const { held } = await navigator.locks.query();
      return (held ?? []).some((lock) => lock.name === this.#leaderLockKey);
    } catch {
      return true;
    }
  }
}

/**
 * Represents a tab becoming a leader and running the worker.
 */
class LeaderSession extends Resource {
  readonly #createWorker: () => WorkerOrPort;
  readonly #coordinator: WorkerCoordinator;
  readonly #config: Record<string, any> | undefined;
  readonly #ownerClientId: string;
  readonly #leaderId = `leader-${crypto.randomUUID()}`;

  #worker!: WorkerOrPort;
  #livenessLockKey!: string;

  constructor(
    createWorker: () => WorkerOrPort,
    coordinator: WorkerCoordinator,
    config: Record<string, any> | undefined,
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
    log('leader-session: creating worker');
    this.#worker = this.#createWorker();
    performance.mark('worker-connection:spawned');
    const listening = new Trigger();
    const ready = new Trigger<DedicatedWorkerMessage & { type: 'ready' }>();
    this.#worker.onmessage = (event: MessageEvent<DedicatedWorkerMessage>) => {
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
            livenessLockKey: this.#livenessLockKey,
            isOwner: event.data.isOwner,
          });
          break;
        default:
          log.error('leader-session: unknown message', { type: event.data });
      }
    };
    if (isWorker(this.#worker)) {
      this.#worker.onerror = (e) => {
        ready.throw(e.error);
        listening.throw(e.error);
      };
    }

    await waitWithLockOrRpcTimeout(listening.wait(), 'waiting for worker to start listening');
    this.#sendMessage({
      type: 'init',
      clientId: this.#leaderId,
      ownerClientId: this.#ownerClientId,
      config: this.#config,
    });
    const readyMessage = await waitWithLockOrRpcTimeout(ready.wait(), 'waiting for worker ready');
    this.#livenessLockKey = readyMessage.livenessLockKey;
    log('leader-session: ready', { leaderId: this.#leaderId });

    void navigator.locks.request(this.#livenessLockKey, () => {
      log('leader-session: worker terminated');
      if (this.isOpen) {
        this.onClose.emit(new Error('Dedicated worker terminated.'));
      }
    });

    this.#coordinator.onMessage.on(this._ctx, (msg) => {
      switch (msg.type) {
        case 'new-leader':
          if (msg.leaderId !== this.#leaderId) {
            log.warn('leader-session: new leader elected while we think we are the leader', {
              newLeaderId: msg.leaderId,
              ourLeaderId: this.#leaderId,
            });
          }
          break;
        case 'request-port':
          this.#sendMessage({ type: 'start-session', clientId: msg.clientId });
          break;
        default:
          break;
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
      this.#worker.terminate();
    } else if (this.#worker instanceof MessagePort) {
      this.#worker.close();
    }
  }

  #sendMessage(msg: DedicatedWorkerMessage) {
    this.#worker.postMessage(msg);
  }
}

const isWorker = (worker: WorkerOrPort): worker is Worker => {
  return typeof Worker !== 'undefined' && worker instanceof Worker;
};
