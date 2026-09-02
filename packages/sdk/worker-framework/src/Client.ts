//
// Copyright 2026 DXOS.org
//

import { AsyncTask, Event, Trigger, asyncTimeout, sleepWithContext } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type { MaybePromise } from '@dxos/util';

import {
  LOCK_OR_RPC_WAIT_TIMEOUT,
  isAbortError,
  lockOrRpcTimeoutError,
  requestExclusiveLock,
  waitWithLockOrRpcTimeout,
} from './internal/locks';
import { workerErrorFromEvent } from './internal/worker-errors';
import * as WorkerProtocol from './WorkerProtocol';

// Sentinel resolved when a follower gives up waiting for a port from the leader.
const LEADER_TIMEOUT = Symbol('leader-timeout');

// `context` is not on `Error`, so read it the way the rest of the repo does rather than asserting
// a shape: merging preserves whatever the thrown error already carried.
const readContext = (error: Error): object =>
  'context' in error && typeof error.context === 'object' && error.context ? error.context : {};

/** How far this tab's own leader-election chain has got. */
export type LeaderPhase =
  | 'idle'
  | 'awaiting-lock'
  | 'lock-held'
  | 'opening-session'
  | 'session-open'
  | 'session-failed';

/** How far this tab's connect task has got towards a usable worker port. */
export type ConnectPhase =
  | 'idle'
  | 'requesting-port'
  | 'port-timeout'
  | 'port-received'
  | 'opening-handle'
  | 'connected';

/**
 * Where the connection had got to when it failed.
 *
 * Both phases are reported because they answer different questions: a tab stuck at
 * `awaiting-lock`/`requesting-port` never heard from a leader, while one at
 * `opening-session`/`session-failed` was the leader and its own worker never came up. The
 * bare timeout these annotate cannot tell the two apart, and they need different fixes.
 * Flat primitives only, so telemetry sinks that forward `string | number | boolean` keep them.
 */
export type ConnectionDiagnostics = {
  workerLeaderPhase: LeaderPhase;
  workerConnectPhase: ConnectPhase;
  /** Whether this tab held the leader lock, so the heartbeat age below is readable. */
  workerIsLeader: boolean;
  workerLeaderFailures: number;
  workerStealCount: number;
  /** Port requests that expired without a `provide-port`; the phase alone is last-write-wins. */
  workerPortTimeouts: number;
  /**
   * Age of the last heartbeat from a leader OTHER than this tab, or -1 when none was ever seen.
   * Excluding our own is what makes the number mean anything: the coordinator broadcasts to the
   * sender too, so a leader heartbeating on a 1s interval while its worker fails to start would
   * otherwise report a healthy sub-second age.
   */
  workerMsSinceLeaderHeartbeat: number;
};

export interface LeaderTimeouts {
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
  /**
   * Backoff before re-entering leader election after the leader session itself fails (as opposed
   * to the lock being stolen), so a persistently failing worker doesn't spin the election in a
   * tight loop.
   */
  retryBackoff?: number;
}

export type Handle = {
  close(): Promise<void>;
};

export type Options = {
  createWorker: () => WorkerProtocol.WorkerOrPort;
  createCoordinator: () => MaybePromise<WorkerProtocol.WorkerCoordinator>;
  leaderLockKey: string;
  config?: Record<string, any>;
  leaderTimeouts?: LeaderTimeouts;
  /**
   * Consecutive leader-session failures before {@link Options.onPersistentFailure} fires. Doubles as
   * the steal budget: the number of unproductive leader-lock steals after which this tab stops
   * stealing and escalates instead.
   */
  maxLeaderFailures?: number;
  /**
   * Invoked once per failure streak when `maxLeaderFailures` consecutive leader-session failures
   * have occurred, or when that many leader-lock steals have failed to produce a port (this tab's
   * coordinator link is broken, so no amount of re-election can help).
   * Election keeps retrying afterwards — the callback lets the app escalate (e.g.
   * prompt or force a reload) instead of backing off silently forever. A common cause is stale
   * mixed-generation workers: a SharedWorker coordinator or dedicated worker running code from a
   * previous dev-server instance or app deploy alongside a freshly loaded page.
   *
   * TODO(burdon): Durable fix for the mixed-generation case: exchange a generation/build id in the
   *  coordinator handshake; on mismatch the older generation steps down, the coordinator self-closes
   *  (so the next connect spawns fresh code), and stale tabs are told to reload.
   */
  onPersistentFailure?: (error: unknown) => void;
  onConnect: (args: {
    clientToWorker: MessagePort;
    workerToClient: MessagePort;
    leaderId: string;
    livenessLockKey: string;
    isOwner: boolean;
  }) => Promise<Handle>;
};

const DEFAULT_LEADER_HEARTBEAT_INTERVAL = 1_000;
// ~5 missed heartbeats: tolerant of main-thread jank (GC pauses, heavy renders) on the leader tab,
// since the heartbeat runs on the leader's main thread while data work runs in the worker.
const DEFAULT_LEADER_STALE_TIMEOUT = 5_000;
const DEFAULT_LEADER_PORT_TIMEOUT = 15_000;
// Backoff before re-entering leader election after the leader session itself fails (as opposed to
// the lock being stolen), so a persistently failing worker doesn't spin the election in a tight loop.
const DEFAULT_LEADER_RETRY_BACKOFF = 1_000;
// Cap on the exponential backoff below, so a worker that fails indefinitely still retries on a
// bounded interval rather than backing off forever.
const MAX_LEADER_RETRY_BACKOFF = 30_000;
// Consecutive failures before onPersistentFailure fires — late enough to skip transient races,
// early enough that a user staring at a boot spinner gets a signal within a few seconds.
const DEFAULT_MAX_LEADER_FAILURES = 4;

/**
 * Manages leader election, coordinator port exchange, and worker lifecycle for dedicated workers.
 * Service-specific wiring is injected via {@link Options.onConnect}.
 */
export class Connection extends Resource {
  readonly #createWorker: () => WorkerProtocol.WorkerOrPort;
  readonly #createCoordinator: () => MaybePromise<WorkerProtocol.WorkerCoordinator>;
  readonly #leaderLockKey: string;
  readonly #config: Record<string, any> | undefined;
  readonly #onConnect: Options['onConnect'];
  readonly #clientId = `worker-connection-${crypto.randomUUID()}`;

  readonly #leaderHeartbeatInterval: number;
  readonly #leaderStaleTimeout: number;
  readonly #leaderPortTimeout: number;
  readonly #leaderRetryBackoff: number;
  readonly #maxLeaderFailures: number;
  readonly #onPersistentFailure: ((error: unknown) => void) | undefined;

  #connectionHandle: Handle | undefined;
  #leaderSession: LeaderSession | undefined;
  #coordinator: WorkerProtocol.WorkerCoordinator | undefined;

  // Timestamp (ms) of the last heartbeat seen from any leader. Seeded at open so "not yet observed"
  // is measured from when we started listening — otherwise a tab that opens between two heartbeats
  // reads the epoch as an infinitely stale leader and steals the lock from a healthy one.
  #lastLeaderHeartbeat = 0;
  // Timestamp (ms) of the last steal attempt; gates against thrashing re-election.
  #lastStealAttempt = 0;
  // Consecutive leader-session open failures; grows the retry backoff and resets once a session
  // opens successfully.
  #leaderFailureCount = 0;
  // Steals since the last successful port exchange: one that yields no port means the incumbent was
  // not the problem, so repeating it only destroys a healthy leader's worker.
  #stealCount = 0;
  // Whether the wedged-tab escalation has already fired for the current steal streak.
  #stealEscalated = false;
  // True while a `#watchLeader` chain holds the leader lock or is queued for it; a tab whose chain
  // has ended is invisible to the wait queue and can never lead again.
  #electionActive = false;
  // Resolves the leader-lock hold; woken on close, worker termination, or when our lock is stolen.
  #leaderDone: Trigger | undefined;

  readonly #initialConnection = new Trigger<void>();
  #isInitialConnection = true;
  // Last error the connect task failed with, surfaced by `_open` in place of the bare timeout.
  #lastConnectError: unknown;
  // Last error the leader session failed with, cleared once a session opens. Surfaced by `_open`
  // when the connect task never got far enough to record one of its own: a leader whose worker
  // will not start is strictly more informative than the timeout that would otherwise replace it.
  #lastLeaderError: unknown;
  #leaderPhase: LeaderPhase = 'idle';
  #connectPhase: ConnectPhase = 'idle';
  // Separate from `#lastLeaderHeartbeat`, which counts this tab's own broadcasts on purpose.
  #lastForeignLeaderHeartbeat = 0;
  // `#connectPhase` is last-write-wins across the retry loop, so a repeated port timeout is
  // invisible in the phase alone: the next run overwrites it with `requesting-port`.
  #portTimeoutCount = 0;
  // Monotonic connect-attempt counter sent with `request-port`, so the worker can tell a raced
  // duplicate of the current attempt from a reconnect after a failed one.
  #connectAttempt = 0;
  readonly #reconnectCallbacks: Array<() => Promise<void>> = [];

  readonly closed = new Event<Error | undefined>();
  readonly reconnected = new Event<void>();

  constructor(options: Options) {
    super();
    this.#createWorker = options.createWorker;
    this.#createCoordinator = options.createCoordinator;
    this.#leaderLockKey = options.leaderLockKey;
    this.#config = options.config;
    this.#onConnect = options.onConnect;
    this.#leaderHeartbeatInterval = options.leaderTimeouts?.heartbeatInterval ?? DEFAULT_LEADER_HEARTBEAT_INTERVAL;
    this.#leaderStaleTimeout = options.leaderTimeouts?.staleTimeout ?? DEFAULT_LEADER_STALE_TIMEOUT;
    this.#leaderPortTimeout = options.leaderTimeouts?.portTimeout ?? DEFAULT_LEADER_PORT_TIMEOUT;
    this.#leaderRetryBackoff = options.leaderTimeouts?.retryBackoff ?? DEFAULT_LEADER_RETRY_BACKOFF;
    this.#maxLeaderFailures = options.maxLeaderFailures ?? DEFAULT_MAX_LEADER_FAILURES;
    // The escalation fires on exact equality with the failure count, so any non-positive-integer
    // value would silently disable it.
    invariant(
      Number.isInteger(this.#maxLeaderFailures) && this.#maxLeaderFailures >= 1,
      'maxLeaderFailures must be a positive integer',
    );
    this.#onPersistentFailure = options.onPersistentFailure;
  }

  onReconnect = (callback: () => Promise<void>) => {
    this.#reconnectCallbacks.push(callback);
  };

  get clientId(): string {
    return this.#clientId;
  }

  override async _open(): Promise<void> {
    log('worker-connection: opening', { clientId: this.#clientId });
    this.#lastLeaderHeartbeat = Date.now();
    this.#coordinator = await this.#createCoordinator();
    this.#coordinator.onMessage.on(this._ctx, (message) => {
      // `new-leader` is proof of life too, and it is the first thing a freshly elected leader sends —
      // counting it avoids a steal in the window before its first heartbeat lands.
      if (message.type === 'leader-heartbeat' || message.type === 'new-leader') {
        this.#lastLeaderHeartbeat = Date.now();
        // The steal heuristic above deliberately counts our own broadcast; the diagnostics must not.
        if (message.leaderId !== this.#clientId) {
          this.#lastForeignLeaderHeartbeat = Date.now();
        }
      }
    });
    this.#watchLeader();
    this.#connectTask.open();
    // The connect task retries on its own, so its first run completing is not the readiness signal —
    // only `#initialConnection` is. Bounding that first run separately would reject `open()` for a
    // follower whose leader is merely slow to hand out a port.
    this.#connectTask.schedule();
    // One full attempt: wait out the port exchange, then open the connection handle. Derived from
    // `portTimeout` so a caller that widens the port wait widens the boot budget with it.
    const openTimeout = this.#leaderPortTimeout + LOCK_OR_RPC_WAIT_TIMEOUT;
    await asyncTimeout(
      this.#initialConnection.wait(),
      openTimeout,
      lockOrRpcTimeoutError('establishing initial worker connection', openTimeout),
    ).catch((error) => {
      const failure = this.#lastConnectError ?? this.#lastLeaderError ?? error;
      // `context` rather than a private key: `@dxos/log` already merges `error.context` into a log
      // entry, so the phase reaches the downloadable log and the reset dialog's copy payload
      // without either of them knowing this package exists.
      throw failure instanceof Error
        ? Object.assign(failure, { context: { ...readContext(failure), ...this.#diagnostics } })
        : failure;
    });
    log('worker-connection: initial connection established');
  }

  get #diagnostics(): ConnectionDiagnostics {
    return {
      workerLeaderPhase: this.#leaderPhase,
      workerConnectPhase: this.#connectPhase,
      workerIsLeader: this.#leaderPhase === 'lock-held' || this.#leaderPhase === 'opening-session',
      workerLeaderFailures: this.#leaderFailureCount,
      workerStealCount: this.#stealCount,
      workerPortTimeouts: this.#portTimeoutCount,
      workerMsSinceLeaderHeartbeat:
        this.#lastForeignLeaderHeartbeat === 0 ? -1 : Date.now() - this.#lastForeignLeaderHeartbeat,
    };
  }

  override async _close(): Promise<void> {
    log('worker-connection: closing');
    await this.#connectTask.close();
    await this.#connectionHandle?.close();
    await this.#leaderSession?.close();
  }

  #watchLeader() {
    // Recovery paths call this whenever they cannot prove a request is outstanding, and a second
    // concurrent chain would trip the `!this.#leaderSession` invariant below.
    if (this.#electionActive) {
      return;
    }
    this.#electionActive = true;
    queueMicrotask(async () => {
      try {
        log('worker-connection: requesting leader lock', { clientId: this.#clientId });
        this.#leaderPhase = 'awaiting-lock';
        await requestExclusiveLock(this.#leaderLockKey, this._ctx.signal, async () => {
          log('worker-connection: leader lock acquired (this tab is leader)', { clientId: this.#clientId });
          this.#leaderPhase = 'lock-held';
          invariant(this.#coordinator);
          invariant(!this.#leaderSession);

          const sendHeartbeat = () =>
            this.#coordinator?.sendMessage({ type: 'leader-heartbeat', leaderId: this.#clientId });
          sendHeartbeat();
          const heartbeat = setInterval(sendHeartbeat, this.#leaderHeartbeatInterval);

          this.#leaderSession = new LeaderSession(this.#createWorker, this.#coordinator, this.#config, this.#clientId);
          const done = new Trigger();
          this.#leaderDone = done;
          // Removed in the `finally` below: election re-enters on every steal/failure, so a
          // permanent registration would grow the connection's dispose list for the tab's lifetime.
          const removeDoneDisposer = this._ctx.onDispose(() => done.wake());
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
            this.#leaderPhase = 'opening-session';
            await waitWithLockOrRpcTimeout(this.#leaderSession.open(), 'opening worker leader session');
            this.#leaderPhase = 'session-open';
            this.#leaderFailureCount = 0;
            this.#lastLeaderError = undefined;
            await done.wait();
          } finally {
            removeDoneDisposer();
            clearInterval(heartbeat);
            this.#leaderDone = undefined;
          }
        });
        this.#electionActive = false;
        log('worker-connection: leader lock released');
        // Returning here would drop this tab out of the lock's wait queue for good, leaving it able
        // to steal but never to lead.
        if (!this._ctx.disposed) {
          this.#watchLeader();
        }
      } catch (error: any) {
        this.#electionActive = false;
        if (isAbortError(error) && this._ctx.disposed) {
          // Normal shutdown: the leader-lock request was aborted because the resource is closing.
          log('worker-connection: leader watch aborted (closing)');
          return;
        }
        this.#leaderDone?.wake();
        const session = this.#leaderSession;
        this.#leaderSession = undefined;
        await session?.close();
        if (this._ctx.disposed) {
          return;
        }
        if (isAbortError(error)) {
          // Our exclusive lock was stolen by another tab that judged this leader stale. The lock
          // callback keeps running per spec, so tear down our leader session and re-enter election.
          log.warn('worker-connection: leader lock stolen, tearing down and re-watching', { clientId: this.#clientId });
          this.#watchLeader();
          return;
        }
        // The leader session itself failed (e.g. worker init/crash). The lock is released once this
        // callback rejects, so re-enter the election after a backoff — otherwise this tab can never
        // host or reconnect to a worker again, leaving followers retrying `provide-port` forever.
        // Exponential backoff (capped) with jitter avoids a tight retry loop and lockstep retries.
        const backoff = Math.min(this.#leaderRetryBackoff * 2 ** this.#leaderFailureCount, MAX_LEADER_RETRY_BACKOFF);
        const jitteredBackoff = backoff * (0.5 + Math.random() * 0.5);
        this.#leaderFailureCount++;
        this.#leaderPhase = 'session-failed';
        this.#lastLeaderError = error;
        log.warn('worker-connection: leader session failed, backing off and re-watching', {
          clientId: this.#clientId,
          error,
          failureCount: this.#leaderFailureCount,
          backoff: jitteredBackoff,
        });
        if (this.#leaderFailureCount === this.#maxLeaderFailures) {
          try {
            this.#onPersistentFailure?.(error);
          } catch (callbackError) {
            log.catch(callbackError);
          }
        }
        try {
          await sleepWithContext(this._ctx, jitteredBackoff);
        } catch {
          // Disposed while backing off.
          return;
        }
        this.#watchLeader();
      }
    });
  }

  #connectTask = new AsyncTask(async () => {
    const ctx = this._ctx.derive();
    // One attempt per run: the heartbeat-driven re-requests below belong to this same attempt, so
    // the worker keeps discarding them as duplicates rather than churning the session.
    const attempt = ++this.#connectAttempt;

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
      this.#connectPhase = 'requesting-port';
      const result = await new Promise<
        (WorkerProtocol.CoordinatorMessage & { type: 'provide-port' }) | typeof LEADER_TIMEOUT
      >((resolve) => {
        invariant(this.#coordinator);

        const unsubscribe = this.#coordinator.onMessage.on((message) => {
          if (message.type === 'provide-port' && message.clientId === this.#clientId) {
            unsubscribe();
            resolve(message);
          } else if (message.type === 'new-leader' || message.type === 'leader-heartbeat') {
            // Re-request on any sign of a live leader. A late-joining follower misses the one-shot
            // `new-leader` broadcast, so its single initial `request-port` is its only chance —
            // if that races the leader's handler registration or is dropped, the follower would
            // otherwise stall for the full port timeout (observed as a second tab that never starts).
            // Heartbeats (~1s) give it a recurring, idempotent retry; the worker de-dupes sessions
            // by clientId, so repeated requests are harmless once a session exists.
            this.#coordinator?.sendMessage({
              type: 'request-port',
              clientId: this.#clientId,
              attempt,
            });
          }
        });

        const timer = setTimeout(() => {
          unsubscribe();
          resolve(LEADER_TIMEOUT);
        }, this.#leaderPortTimeout);
        // Remove the coordinator listener if the context is disposed before provide-port/timeout,
        // otherwise interrupted reconnect cycles accumulate listeners on the coordinator.
        ctx.onDispose(() => clearTimeout(timer));
        ctx.onDispose(() => unsubscribe());

        this.#coordinator.sendMessage({
          type: 'request-port',
          clientId: this.#clientId,
          attempt,
        });
      });

      if (result === LEADER_TIMEOUT) {
        this.#connectPhase = 'port-timeout';
        this.#portTimeoutCount++;
        log.warn('worker-connection: timed out waiting for provide-port', { clientId: this.#clientId });
        await this.#maybeStealStaleLeader();
        this.#connectTask.schedule();
        return;
      }

      const { clientToWorker, workerToClient, leaderId, livenessLockKey, isOwner } = result;
      log('worker-connection: connected to worker', { leaderId, isOwner });
      this.#connectPhase = 'port-received';
      this.#lastConnectError = undefined;
      // A port proves the coordinator link works, so the steal budget below is about the incumbent
      // rather than this tab.
      this.#stealCount = 0;
      this.#stealEscalated = false;

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
      invariant(this.#coordinator);
      this.#coordinator.onMessage.on(ctx, async (msg) => {
        if (msg.type === 'new-leader' && msg.leaderId !== leaderId) {
          await handleLeaderStopped();
        }
      });

      this.#connectPhase = 'opening-handle';
      this.#connectionHandle = await waitWithLockOrRpcTimeout(
        this.#onConnect({ clientToWorker, workerToClient, leaderId, livenessLockKey, isOwner }),
        'opening worker connection handle',
      );
      this.#connectPhase = 'connected';

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
      // Deliberately does not settle `#initialConnection`: a Trigger cannot be re-armed once it
      // throws, so rejecting here would fail `open()` permanently for a failure the reschedule below
      // recovers from — the tab then sits on a boot spinner while its worker connection is live.
      this.#lastConnectError = err;
      log.warn('worker-connection: connect task failed, will reschedule', { err });
      log.catch(err);
      void ctx.dispose();
      this.#connectTask?.schedule();
    }
  });

  async #maybeStealStaleLeader(): Promise<void> {
    // Every steal kills the incumbent's worker, so it has to pay for itself: past this many with no
    // port to show for it, what is broken is this tab's coordinator link, which the lock cannot fix.
    if (this.#stealCount >= this.#maxLeaderFailures) {
      // Once per streak: the port timeout keeps firing, so a warning per cycle would bury the
      // escalation it is meant to explain.
      if (!this.#stealEscalated) {
        this.#stealEscalated = true;
        log.warn('worker-connection: steal budget exhausted, coordinator link is broken', {
          clientId: this.#clientId,
          stealCount: this.#stealCount,
        });
        try {
          this.#onPersistentFailure?.(
            new Error(`Worker connection wedged: ${this.#stealCount} leader-lock steals yielded no port.`),
          );
        } catch (callbackError) {
          log.catch(callbackError);
        }
      }
      return;
    }

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
    this.#stealCount++;

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

    // The steal only evicts — the lock is released the moment the callback above returns — so without
    // re-arming, a tab whose chain has ended takes the lock and hands it straight back.
    this.#watchLeader();
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
  readonly #createWorker: () => WorkerProtocol.WorkerOrPort;
  readonly #coordinator: WorkerProtocol.WorkerCoordinator;
  readonly #config: Record<string, any> | undefined;
  readonly #ownerClientId: string;
  readonly #leaderId = `leader-${crypto.randomUUID()}`;

  #worker!: WorkerProtocol.WorkerOrPort;
  #livenessLockKey!: string;

  constructor(
    createWorker: () => WorkerProtocol.WorkerOrPort,
    coordinator: WorkerProtocol.WorkerCoordinator,
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
    const ready = new Trigger<WorkerProtocol.DedicatedWorkerMessage & { type: 'ready' }>();
    this.#worker.onmessage = (event: MessageEvent<WorkerProtocol.DedicatedWorkerMessage>) => {
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
            clientToWorker: event.data.clientToWorker,
            workerToClient: event.data.workerToClient,
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
      this.#worker.onerror = (event) => {
        const error = workerErrorFromEvent(event, 'dedicated');
        ready.throw(error);
        listening.throw(error);
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
          this.#sendMessage({ type: 'start-session', clientId: msg.clientId, attempt: msg.attempt });
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

  #sendMessage(msg: WorkerProtocol.DedicatedWorkerMessage) {
    this.#worker.postMessage(msg);
  }
}

const isWorker = (worker: WorkerProtocol.WorkerOrPort): worker is Worker => {
  return typeof Worker !== 'undefined' && worker instanceof Worker;
};
