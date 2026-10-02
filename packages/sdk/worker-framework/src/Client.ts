//
// Copyright 2026 DXOS.org
//

import { AsyncTask, Event, Trigger, asyncTimeout, sleepWithContext } from '@dxos/async';
import { type Context, ContextDisposedError, Resource } from '@dxos/context';
import { withContext } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type { MaybePromise } from '@dxos/util';

import { WorkerBuildMismatchError, WorkerNotTerminableError, WorkerTerminationError } from './errors.ts';
import { DisplaceChannel, type TerminateRequest } from './internal/displace-channel.ts';
import {
  LOCK_OR_RPC_WAIT_TIMEOUT,
  isAbortError,
  isLockHeld,
  lockOrRpcTimeoutError,
  requestExclusiveLock,
  waitWithLockOrRpcTimeout,
} from './internal/locks.ts';
import { workerErrorFromEvent } from './internal/worker-errors.ts';
import * as WorkerProtocol from './WorkerProtocol.ts';

// Sentinel resolved when a follower gives up waiting for a port from the leader.
const LEADER_TIMEOUT = Symbol('leader-timeout');

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

/** Where the connection had got to when it failed. */
export type ConnectionDiagnostics = {
  workerLeaderPhase: LeaderPhase;
  workerConnectPhase: ConnectPhase;
  /** Whether this tab held the leader lock. */
  workerIsLeader: boolean;
  workerLeaderFailures: number;
  /** Consecutive connect attempts that received a port but failed to open the connection handle. */
  workerConnectFailures: number;
  /** Recovery attempts since the last port: lock steals, or port timeouts while this tab led. */
  workerStealCount: number;
  /** Port requests that expired without a `provide-port`. */
  workerPortTimeouts: number;
  /** Age of the last heartbeat from a leader OTHER than this tab; absent when none was seen. */
  workerMsSinceLeaderHeartbeat?: number;
  /** The coordinator link's own failure, when it reported one. */
  workerCoordinatorError?: string;
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
   * to the lock being stolen), and before retrying a connect attempt whose handle failed to open, so
   * a persistently failing worker or handle doesn't spin either loop in a tight cycle.
   */
  retryBackoff?: number;
  /**
   * Time the tab gives its own worker to answer the liveness probe it sends when another worker
   * escalates, before accepting that the worker is wedged and terminating it.
   */
  workerProbeTimeout?: number;
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
   * the budget for consecutive connect-handle failures and for unproductive recoveries (leader-lock
   * steals, or port timeouts while leading) after which this tab stops stealing and escalates instead.
   */
  maxLeaderFailures?: number;
  /**
   * Invoked once per failure streak when `maxLeaderFailures` consecutive leader-session failures
   * have occurred, when that many connect attempts received a port but failed to open the handle,
   * or when that many leader-lock steals have failed to produce a port (this tab's coordinator link
   * is broken, so no amount of re-election can help).
   * Election keeps retrying afterwards — the callback lets the app escalate (e.g.
   * prompt or force a reload) instead of backing off silently forever. A common cause is stale
   * mixed-generation workers: a SharedWorker coordinator or dedicated worker running code from a
   * previous dev-server instance or app deploy alongside a freshly loaded page.
   *
   * A mixed generation is caught earlier when both sides carry a {@link Options.buildId}.
   */
  onPersistentFailure?: (error: unknown) => void;
  /**
   * Identifies the app build this tab runs, and so the build of any worker it spawns as leader. When
   * set, a follower refuses a leader's port unless the leader reports the same build: RPC contracts
   * change between builds, and a tab speaking one to a worker from another mis-decodes replies —
   * a write the worker committed then reads as failed and is retried as a duplicate. A leader that
   * reports no build predates this check, so it counts as a different build.
   */
  buildId?: string;
  /**
   * Invoked on both sides of a refused port: on the follower that refused it, and on the leader (when
   * its build carries this check) through the follower's broadcast. Only the app knows which build is
   * newer and whether a reload is safe, so converging the generations — typically by reloading the
   * older tab — is left to it. Fires on every refused attempt, so the callback owns its own guard.
   */
  onBuildMismatch?: (mismatch: BuildMismatch) => void;
  onConnect: (args: {
    clientToWorker: MessagePort;
    workerToClient: MessagePort;
    leaderId: string;
    livenessLockKey: string;
    isOwner: boolean;
  }) => Promise<Handle>;
};

/** A leader and a follower found running different app builds; see {@link Options.onBuildMismatch}. */
export type BuildMismatch = {
  /** Which side of the refused port this tab is on. */
  role: 'leader' | 'follower';
  /** This tab's build. */
  local: string | undefined;
  /** The other side's build; `undefined` when it predates build ids. */
  remote: string | undefined;
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
// Time a worker gets to answer the probe that decides whether it is the wedged incumbent. Generous
// for a main-thread round trip, and small against the ~5s the escalating worker's own leader session
// has left after its grace period, which is what the terminate still has to fit inside.
const DEFAULT_WORKER_PROBE_TIMEOUT = 1_000;

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
  readonly #workerProbeTimeout: number;
  readonly #maxLeaderFailures: number;
  readonly #onPersistentFailure: ((error: unknown) => void) | undefined;
  readonly #buildId: string | undefined;
  readonly #onBuildMismatch: ((mismatch: BuildMismatch) => void) | undefined;

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
  // Consecutive connect attempts that got a port but whose handle failed to open; grows the retry
  // backoff and resets once a handle opens.
  #connectFailureCount = 0;
  // Steals since the last successful port exchange: one that yields no port means the incumbent was
  // not the problem, so repeating it only destroys a healthy leader's worker.
  #stealCount = 0;
  // Set once the coordinator reports its link dead: no message will ever arrive, so a steal can only
  // destroy a healthy leader's worker, and a connection still booting cannot complete.
  #coordinatorError: Error | undefined;
  // Whether the wedged-tab escalation has already fired for the current steal streak.
  #stealEscalated = false;
  // True while a `#watchLeader` chain holds the leader lock or is queued for it; a tab whose chain
  // has ended is invisible to the wait queue and can never lead again.
  #electionActive = false;
  // Resolves the leader-lock hold; woken on close, worker termination, or when our lock is stolen.
  #leaderDone: Trigger | undefined;

  readonly #initialConnection = new Trigger<void>();
  #isInitialConnection = true;
  // Last error the connect task failed with, surfaced by `_open` in place of the bare timeout; held until a
  // connection is established.
  #lastConnectError: unknown;
  #lastLeaderError: unknown;
  #leaderPhase: LeaderPhase = 'idle';
  // Whether this tab is inside the leader lock's callback, which is exactly when it is the leader.
  // Deriving this from the phase instead drops whichever phase a later change forgets to list.
  #holdsLeaderLock = false;
  #connectPhase: ConnectPhase = 'idle';
  #peerLeaderHeartbeat = 0;
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
    this.#workerProbeTimeout = options.leaderTimeouts?.workerProbeTimeout ?? DEFAULT_WORKER_PROBE_TIMEOUT;
    this.#maxLeaderFailures = options.maxLeaderFailures ?? DEFAULT_MAX_LEADER_FAILURES;
    // The escalation fires on exact equality with the failure count, so any non-positive-integer
    // value would silently disable it.
    invariant(
      Number.isInteger(this.#maxLeaderFailures) && this.#maxLeaderFailures >= 1,
      'maxLeaderFailures must be a positive integer',
    );
    this.#onPersistentFailure = options.onPersistentFailure;
    this.#buildId = options.buildId;
    this.#onBuildMismatch = options.onBuildMismatch;
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
        if (message.leaderId !== this.#clientId) {
          this.#peerLeaderHeartbeat = Date.now();
        }
      }
      if (message.type === 'build-mismatch' && message.leaderId === this.#leaderSession?.leaderId) {
        log.warn('worker-connection: a follower refused this leader: different build', {
          clientId: message.clientId,
          local: this.#buildId,
          remote: message.buildId,
        });
        this.#reportBuildMismatch({ role: 'leader', local: this.#buildId, remote: message.buildId });
      }
    });
    this.#coordinator.onError?.on(this._ctx, (error) => {
      log.error('worker-connection: coordinator link failed', { clientId: this.#clientId, error });
      this.#coordinatorError = error;
      if (this.#isInitialConnection) {
        // Nothing can arrive over this link, so the boot fails now rather than at the end of its budget.
        void this.#failInitialConnection(error);
      }
    });
    this.#watchLeader(this._ctx);
    this.#connectTask.open();
    // The connect task retries on its own, so its first run completing is not the readiness signal —
    // only `#initialConnection` is. Bounding that first run separately would reject `open()` for a
    // follower whose leader is merely slow to hand out a port.
    this.#connectTask.schedule();
    // One full attempt: wait out the port exchange, then open the connection handle. Derived from
    // `portTimeout` so a caller that widens the port wait widens the boot budget with it.
    const openTimeout = this.#leaderPortTimeout + LOCK_OR_RPC_WAIT_TIMEOUT;
    const timeoutError = lockOrRpcTimeoutError('establishing initial worker connection', openTimeout);
    await asyncTimeout(this.#initialConnection.wait(), openTimeout, timeoutError).catch(async (error) => {
      // Snapshotted before the teardown below, which is what they describe.
      const diagnostics = this.#diagnostics;
      // `Resource.close()` is a no-op on a resource that never opened, so an expired boot releases
      // its lock, worker and timers itself.
      if (error === timeoutError) {
        await this.#teardown();
      }
      // Only an expired budget reports the failure it outlasted; a rejected connection carries its own cause.
      throw withContext(
        error === timeoutError ? (this.#lastConnectError ?? this.#lastLeaderError ?? error) : error,
        diagnostics,
      );
    });
    log('worker-connection: initial connection established');
  }

  /**
   * Ends a boot that can no longer succeed with `error`, releasing everything the connection holds.
   * A connection whose open failed is never closed, so it stops its own connect task and listeners.
   */
  async #failInitialConnection(error: Error): Promise<void> {
    await this.#teardown();
    this.#initialConnection.throw(error);
  }

  async #teardown(): Promise<void> {
    await this._ctx.dispose();
    await this.#connectTask.close();
    const handle = this.#connectionHandle;
    this.#connectionHandle = undefined;
    await handle?.close().catch((err) => log.catch(err));
    const session = this.#leaderSession;
    this.#leaderSession = undefined;
    await session?.close();
  }

  get #diagnostics(): ConnectionDiagnostics {
    return {
      workerLeaderPhase: this.#leaderPhase,
      workerConnectPhase: this.#connectPhase,
      workerIsLeader: this.#holdsLeaderLock,
      workerLeaderFailures: this.#leaderFailureCount,
      workerConnectFailures: this.#connectFailureCount,
      workerStealCount: this.#stealCount,
      workerPortTimeouts: this.#portTimeoutCount,
      workerMsSinceLeaderHeartbeat: this.#peerLeaderHeartbeat ? Date.now() - this.#peerLeaderHeartbeat : undefined,
      workerCoordinatorError: this.#coordinatorError?.message,
    };
  }

  /** Backoff for the `count`-th consecutive failure: exponential from `retryBackoff`, capped, with jitter. */
  #backoffFor(count: number): number {
    const backoff = Math.min(this.#leaderRetryBackoff * 2 ** count, MAX_LEADER_RETRY_BACKOFF);
    return backoff * (0.5 + Math.random() * 0.5);
  }

  #reportBuildMismatch(mismatch: BuildMismatch): void {
    try {
      this.#onBuildMismatch?.(mismatch);
    } catch (callbackError) {
      log.catch(callbackError);
    }
  }

  #escalate(error: unknown): void {
    try {
      this.#onPersistentFailure?.(error);
    } catch (callbackError) {
      log.catch(callbackError);
    }
  }

  /** Re-runs the connect task unless the connection is closing, when the task no longer accepts work. */
  #scheduleConnect(): void {
    if (!this._ctx.disposed) {
      this.#connectTask.schedule();
    }
  }

  override async _close(): Promise<void> {
    log('worker-connection: closing');
    await this.#connectTask.close();
    await this.#connectionHandle?.close();
    await this.#leaderSession?.close();
  }

  // Bound to the context it started under: after close, `_ctx` is a fresh, undisposed context.
  #watchLeader(ctx: Context) {
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
        await requestExclusiveLock(this.#leaderLockKey, ctx.signal, async () => {
          log('worker-connection: leader lock acquired (this tab is leader)', { clientId: this.#clientId });
          this.#leaderPhase = 'lock-held';
          this.#holdsLeaderLock = true;
          invariant(this.#coordinator);
          invariant(!this.#leaderSession);
          // A stolen lock leaves this callback running while the next hold starts, so every write
          // to per-hold state after an await first checks that this is still the current hold.
          const session = new LeaderSession(
            this.#createWorker,
            this.#coordinator,
            this.#config,
            this.#clientId,
            this.#workerProbeTimeout,
            this.#buildId,
          );
          const isCurrent = () => this.#leaderSession === session;
          try {
            const sendHeartbeat = () =>
              this.#coordinator?.sendMessage({ type: 'leader-heartbeat', leaderId: this.#clientId });
            sendHeartbeat();
            const heartbeat = setInterval(sendHeartbeat, this.#leaderHeartbeatInterval);

            this.#leaderSession = session;
            const done = new Trigger();
            this.#leaderDone = done;
            // Removed in the `finally` below: election re-enters on every steal/failure, so a
            // permanent registration would grow the connection's dispose list for the tab's lifetime.
            const removeDoneDisposer = ctx.onDispose(() => done.wake());
            // Left in place for the failure path below to close: a session nobody closes keeps its
            // coordinator listener for the tab's lifetime, one more per worker that dies.
            session.onClose.on((error) => {
              log('worker-connection: leader session closed', { hasError: !!error });
              if (error) {
                done.throw(error);
              } else {
                done.wake();
              }
            });
            try {
              this.#leaderPhase = 'opening-session';
              await session.open();
              // `Resource.close()` is a no-op while opening, so a close or steal that ran meanwhile
              // skipped this session, whose worker would keep the storage lock the next leader waits on.
              if (ctx.disposed || !isCurrent()) {
                log('worker-connection: leader session ended while opening, closing it');
                await session.close();
                return;
              }
              this.#leaderPhase = 'session-open';
              this.#leaderFailureCount = 0;
              this.#lastLeaderError = undefined;
              await done.wait();
            } finally {
              removeDoneDisposer();
              clearInterval(heartbeat);
              if (this.#leaderDone === done) {
                this.#leaderDone = undefined;
              }
            }
          } finally {
            if (isCurrent() || !this.#leaderSession) {
              this.#holdsLeaderLock = false;
            }
          }
        });
        this.#electionActive = false;
        log('worker-connection: leader lock released');
        // Returning here would drop this tab out of the lock's wait queue for good, leaving it able
        // to steal but never to lead.
        if (!ctx.disposed) {
          this.#watchLeader(ctx);
        }
      } catch (error: any) {
        this.#electionActive = false;
        if (isAbortError(error) && ctx.disposed) {
          // Normal shutdown: the leader-lock request was aborted because the resource is closing.
          log('worker-connection: leader watch aborted (closing)');
          return;
        }
        this.#leaderDone?.wake();
        const session = this.#leaderSession;
        this.#leaderSession = undefined;
        await session?.close();
        if (ctx.disposed) {
          return;
        }
        // Checked before the steal branch: the worker's error keeps its name, which can be `AbortError`.
        const startFailure = session?.startFailure;
        if (!startFailure && isAbortError(error)) {
          // Our exclusive lock was stolen by another tab that judged this leader stale. The lock
          // callback keeps running per spec, so tear down our leader session and re-enter election.
          log.warn('worker-connection: leader lock stolen, tearing down and re-watching', { clientId: this.#clientId });
          this.#watchLeader(ctx);
          return;
        }
        if (startFailure && this.#isInitialConnection) {
          // A runtime that failed to start ends the initial connection with its error instead of respawning.
          this.#leaderFailureCount++;
          this.#leaderPhase = 'session-failed';
          this.#lastLeaderError = startFailure;
          log.warn('worker-connection: worker runtime failed to start', {
            clientId: this.#clientId,
            error: startFailure,
          });
          await this.#failInitialConnection(startFailure);
          return;
        }
        // The leader session itself failed (e.g. worker init/crash). The lock is released once this
        // callback rejects, so re-enter the election after a backoff — otherwise this tab can never
        // host or reconnect to a worker again, leaving followers retrying `provide-port` forever.
        // Exponential backoff (capped) with jitter avoids a tight retry loop and lockstep retries.
        const jitteredBackoff = this.#backoffFor(this.#leaderFailureCount);
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
          this.#escalate(error);
          if (this.#isInitialConnection) {
            await this.#failInitialConnection(withContext(error, this.#diagnostics));
            return;
          }
        }
        try {
          await sleepWithContext(ctx, jitteredBackoff);
        } catch {
          // Disposed while backing off.
          return;
        }
        this.#watchLeader(ctx);
      }
    });
  }

  #connectTask = new AsyncTask(async () => {
    const ctx = this._ctx.derive();
    // One attempt per run: the heartbeat-driven re-requests below belong to this same attempt, so
    // the worker keeps discarding them as duplicates rather than churning the session.
    const attempt = ++this.#connectAttempt;
    // Held for this attempt's lifetime and handed to the worker, which ends the session when it
    // releases — the only way the worker learns that this tab closed or died.
    const sessionLockKey = `${this.#clientId}/session/${attempt}`;
    // Set when the worker reports that the session behind this attempt's ports could not be built.
    let sessionFailure: Error | undefined;

    // Closes the stale handle BEFORE rescheduling, so the next `onConnect` cannot interleave with the
    // old `close`; disposing first ends an attempt still opening, so the retry is not queued behind it.
    const handleLeaderStopped = async () => {
      log('worker-connection: lost connection');
      await ctx.dispose();
      const oldHandle = this.#connectionHandle;
      this.#connectionHandle = undefined;
      if (oldHandle) {
        await waitWithLockOrRpcTimeout(oldHandle.close(), 'closing stale worker connection handle').catch((err) =>
          log.catch(err),
        );
      }
      this.#scheduleConnect();
    };

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.locks !== 'undefined') {
        const granted = new Trigger<Error | undefined>();
        const released = new Trigger();
        ctx.onDispose(() => released.wake());
        navigator.locks
          .request(sessionLockKey, { signal: ctx.signal }, async () => {
            granted.wake(undefined);
            await released.wait();
          })
          .catch((err) => {
            if (!isAbortError(err)) {
              log.catch(err);
            }
            // The attempt waits on this trigger, so a rejection has to wake it — an already-aborted
            // `ctx.signal` rejects immediately, and this attempt would otherwise never finish or fail.
            granted.wake(err);
          });
        const grantError = await granted.wait();
        if (grantError) {
          throw grantError;
        }
      }

      log('worker-connection: requesting port from leader');
      this.#connectPhase = 'requesting-port';
      const result = await new Promise<
        (WorkerProtocol.CoordinatorMessage & { type: 'provide-port' }) | typeof LEADER_TIMEOUT
      >((resolve, reject) => {
        invariant(this.#coordinator);

        const unsubscribe = this.#coordinator.onMessage.on((message) => {
          if (message.type === 'provide-port' && message.clientId === this.#clientId) {
            // The worker closes an abandoned attempt's session when it serves this one, so its ports
            // would hang until the handle timeout; a worker predating the field sends no attempt.
            if (message.attempt !== undefined && message.attempt !== attempt) {
              log('worker-connection: ignoring provide-port for a superseded attempt', {
                attempt,
                received: message.attempt,
              });
              return;
            }
            unsubscribe();
            resolve(message);
          } else if (
            message.type === 'session-failed' &&
            message.clientId === this.#clientId &&
            (message.attempt === undefined || message.attempt === attempt)
          ) {
            // The worker already gave this attempt up; whether or not its ports still arrive, retry.
            log('worker-connection: session failed before its port arrived', { attempt });
            unsubscribe();
            sessionFailure = WorkerProtocol.decodeError(message.error);
            reject(sessionFailure);
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
              sessionLockKey,
            });
          }
        });

        const timer = setTimeout(() => {
          unsubscribe();
          resolve(LEADER_TIMEOUT);
        }, this.#leaderPortTimeout);
        // Settled on dispose: with the timer cleared and the listener gone, nothing else would end
        // this attempt, and `connectTask.close()` waits for it.
        ctx.onDispose(() => {
          clearTimeout(timer);
          unsubscribe();
          reject(new ContextDisposedError());
        });

        this.#coordinator.sendMessage({
          type: 'request-port',
          clientId: this.#clientId,
          attempt,
          sessionLockKey,
        });
      });

      if (ctx.disposed) {
        return;
      }

      if (result === LEADER_TIMEOUT) {
        this.#connectPhase = 'port-timeout';
        this.#portTimeoutCount++;
        log.warn('worker-connection: timed out waiting for provide-port', { clientId: this.#clientId });
        await this.#maybeStealStaleLeader();
        this.#scheduleConnect();
        return;
      }

      const { clientToWorker, workerToClient, leaderId, livenessLockKey, isOwner } = result;
      if (this.#buildId !== undefined && result.buildId !== this.#buildId) {
        // Closing the ports and failing the attempt releases its session lock, which ends the session.
        clientToWorker.close();
        workerToClient.close();
        const mismatch = { role: 'follower', local: this.#buildId, remote: result.buildId } as const;
        this.#coordinator?.sendMessage({
          type: 'build-mismatch',
          leaderId,
          clientId: this.#clientId,
          buildId: this.#buildId,
        });
        this.#reportBuildMismatch(mismatch);
        throw new WorkerBuildMismatchError({ context: { leaderId, local: mismatch.local, remote: mismatch.remote } });
      }
      log('worker-connection: connected to worker', { leaderId, isOwner });
      this.#connectPhase = 'port-received';
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
        } else if (
          msg.type === 'session-failed' &&
          msg.clientId === this.#clientId &&
          (msg.attempt === undefined || msg.attempt === attempt)
        ) {
          // The ports in hand lead nowhere; ending the attempt here saves the handle's full timeout.
          log('worker-connection: session failed after its port arrived', { attempt, installed });
          sessionFailure = WorkerProtocol.decodeError(msg.error);
          await ctx.dispose();
          if (installed) {
            // Already connected as far as this tab knew: the catch below has run, so retry from here.
            const handle = this.#connectionHandle;
            this.#connectionHandle = undefined;
            await handle?.close().catch((err) => log.catch(err));
            await this.#retryAfterConnectFailure(sessionFailure);
          }
        }
      });

      this.#connectPhase = 'opening-handle';
      let installed = false;
      // `onConnect` cannot be cancelled, so a handle that arrives after this attempt timed out or
      // was abandoned is closed instead of installed over the live one.
      const opening = this.#onConnect({ clientToWorker, workerToClient, leaderId, livenessLockKey, isOwner });
      const closeLate = () =>
        void opening.then(
          (handle) => {
            log.warn('worker-connection: closing handle that opened after its attempt ended', { attempt });
            void handle.close().catch((err) => log.catch(err));
          },
          () => {},
        );
      let handle: Handle;
      try {
        handle = await untilDisposed(ctx, waitWithLockOrRpcTimeout(opening, 'opening worker connection handle'));
      } catch (err) {
        closeLate();
        throw err;
      }
      if (ctx.disposed) {
        closeLate();
        throw new ContextDisposedError();
      }
      this.#connectionHandle = handle;
      installed = true;
      this.#connectPhase = 'connected';
      this.#lastConnectError = undefined;
      this.#connectFailureCount = 0;

      if (this.#isInitialConnection) {
        performance.mark('worker-connection:session-ready');
        this.#isInitialConnection = false;
        this.#initialConnection.wake();
      } else {
        log('worker-connection: reconnecting, calling callbacks', { count: this.#reconnectCallbacks.length });
        // Isolated: a caller's failing callback must not fail the reconnection it is reacting to.
        await Promise.all(this.#reconnectCallbacks.map((cb) => cb().catch((err) => log.catch(err))));
        this.reconnected.emit();
      }
    } catch (caught: any) {
      if (ctx.disposed && !sessionFailure) {
        // Abandoned from outside (worker died, connection closing); whoever disposed it reschedules.
        log('worker-connection: connect attempt abandoned', { attempt });
        return;
      }
      void ctx.dispose();
      await this.#retryAfterConnectFailure(sessionFailure ?? caught);
    }
  });

  /**
   * Records a connect attempt that got a port but no working handle, then retries after a backoff:
   * a handle that fails every time would otherwise churn a fresh worker session per millisecond, and
   * the escalation lets the app surface it instead of retrying silently forever.
   */
  async #retryAfterConnectFailure(err: unknown): Promise<void> {
    // Settling `#initialConnection` here would fail `open()` permanently for a failure the retry
    // recovers from, so it only settles at the escalation threshold below.
    this.#lastConnectError = err;
    const backoff = this.#backoffFor(this.#connectFailureCount);
    this.#connectFailureCount++;
    log.warn('worker-connection: connect attempt failed, will retry', {
      err,
      failureCount: this.#connectFailureCount,
      backoff,
    });
    log.catch(err);
    if (this.#connectFailureCount === this.#maxLeaderFailures) {
      this.#escalate(err);
      if (this.#isInitialConnection) {
        // Not awaited: the teardown joins the connect task this may be running in.
        void this.#failInitialConnection(
          withContext(err instanceof Error ? err : new Error(String(err)), this.#diagnostics),
        );
        return;
      }
    }
    try {
      await sleepWithContext(this._ctx, backoff);
    } catch {
      return;
    }
    this.#scheduleConnect();
  }

  async #maybeStealStaleLeader(): Promise<void> {
    // Every steal kills the incumbent's worker, so it has to pay for itself: past this many with no
    // port to show for it, what is broken is this tab's coordinator link, which the lock cannot fix.
    if (this.#stealCount >= this.#maxLeaderFailures) {
      // Once per streak: the port timeout keeps firing, so a warning per cycle would bury the
      // escalation it is meant to explain.
      if (!this.#stealEscalated) {
        this.#stealEscalated = true;
        log.warn('worker-connection: recovery budget exhausted, no port after repeated attempts', {
          clientId: this.#clientId,
          attempts: this.#stealCount,
        });
        this.#escalate(new Error(`Worker connection wedged: ${this.#stealCount} recovery attempts yielded no port.`));
      }
      return;
    }

    if (this.#coordinatorError) {
      // The link is known dead, so no heartbeat can arrive: the incumbent is not stale, just unreachable.
      this.#stealCount++;
      log.warn('worker-connection: coordinator link failed, not stealing', { clientId: this.#clientId });
      return;
    }

    if (this.#holdsLeaderLock) {
      // Our own worker did not answer us. Stealing our own lock would only restart a worker that
      // other tabs may be using fine, so count it towards the escalation and wait.
      this.#stealCount++;
      log.warn('worker-connection: leader timed out waiting for its own worker, not stealing', {
        clientId: this.#clientId,
      });
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
    this.#watchLeader(this._ctx);
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
  readonly #workerProbeTimeout: number;
  readonly #buildId: string | undefined;
  readonly #leaderId = `leader-${crypto.randomUUID()}`;
  /** Nonces the worker has echoed back, matched against the probe that is waiting for one. */
  readonly #probeReplies = new Event<string>();

  #worker!: WorkerProtocol.WorkerOrPort;
  #livenessLockKey!: string;
  #workerId!: string;
  #displaceChannel: DisplaceChannel | undefined;
  /** In-flight termination check, so concurrent escalations resolve into one. */
  #terminationCheck: Promise<void> | undefined;
  #startFailure: Error | undefined;

  constructor(
    createWorker: () => WorkerProtocol.WorkerOrPort,
    coordinator: WorkerProtocol.WorkerCoordinator,
    config: Record<string, any> | undefined,
    ownerClientId: string,
    workerProbeTimeout: number,
    buildId: string | undefined,
  ) {
    super();
    this.#createWorker = createWorker;
    this.#coordinator = coordinator;
    this.#config = config;
    this.#ownerClientId = ownerClientId;
    this.#workerProbeTimeout = workerProbeTimeout;
    this.#buildId = buildId;
  }

  readonly onClose = new Event<Error | undefined>();

  /** Identifies this session in the `provide-port` messages it sends. */
  get leaderId(): string {
    return this.#leaderId;
  }

  /** The error the worker reported when its runtime failed to start. */
  get startFailure(): Error | undefined {
    return this.#startFailure;
  }

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
        case 'pong':
          this.#probeReplies.emit(event.data.nonce);
          break;
        case 'init-failed':
          this.#startFailure = WorkerProtocol.decodeError(event.data.error);
          ready.throw(this.#startFailure);
          break;
        case 'session':
          this.#coordinator.sendMessage({
            type: 'provide-port',
            clientToWorker: event.data.clientToWorker,
            workerToClient: event.data.workerToClient,
            clientId: event.data.clientId,
            attempt: event.data.attempt,
            leaderId: this.#leaderId,
            livenessLockKey: this.#livenessLockKey,
            isOwner: event.data.isOwner,
            buildId: this.#buildId,
          });
          break;
        case 'session-failed':
          this.#coordinator.sendMessage({
            type: 'session-failed',
            clientId: event.data.clientId,
            attempt: event.data.attempt,
            error: event.data.error,
          });
          break;
        default:
          log.error('leader-session: unknown message', { type: event.data });
      }
    };
    if (isWorker(this.#worker)) {
      this.#worker.onerror = (event) => {
        const error = workerErrorFromEvent(event, 'dedicated');
        // After the handshake the worker survives an uncaught error, so it is only reported.
        log.error('leader-session: dedicated worker error', { leaderId: this.#leaderId, error });
        ready.throw(error);
        listening.throw(error);
      };
    }

    const handshake = async () => {
      await listening.wait();
      this.#sendMessage({
        type: 'init',
        clientId: this.#leaderId,
        ownerClientId: this.#ownerClientId,
        config: this.#config,
      });
      return ready.wait();
    };
    // Nothing else closes a session whose open failed, and its worker would keep the storage lock that the
    // next leader's worker waits on.
    const readyMessage = await waitWithLockOrRpcTimeout(handshake(), 'opening worker leader session').catch((error) => {
      this.#closeWorker();
      throw error;
    });
    this.#livenessLockKey = readyMessage.livenessLockKey;
    this.#workerId = readyMessage.workerId;
    log('leader-session: ready', { leaderId: this.#leaderId });

    // Second-level displacement (DX-1293): a worker wedged enough to ignore the cooperative stop
    // signal holds the storage lock until the tab owning its handle terminates it, and this tab is
    // the only party that holds that handle.
    if (readyMessage.workerId && readyMessage.displaceChannel) {
      this.#displaceChannel = new DisplaceChannel(readyMessage.displaceChannel);
      this.#displaceChannel.onTerminate = (request) => void this.#onTerminateRequest(request);
    } else {
      // A worker from a build that predates these fields cannot be escalated against, but it still
      // displaces cooperatively, so the session runs on rather than failing the tab's connection.
      log.warn('leader-session: worker predates forced displacement, escalation unavailable', {
        leaderId: this.#leaderId,
      });
    }

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
          this.#sendMessage({
            type: 'start-session',
            clientId: msg.clientId,
            attempt: msg.attempt,
            sessionLockKey: msg.sessionLockKey,
          });
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
    this.#displaceChannel?.close();
    this.#displaceChannel = undefined;
    this.#closeWorker();
  }

  /**
   * Acts on an escalation only when the worker this tab owns is the one holding up the storage lock.
   *
   * The escalation is broadcast to every tab on that lock, and the issuer cannot name the incumbent
   * — nothing tells a queued worker who holds the lock — so with three or more tabs an issuer-only
   * check has every bystander kill its own worker (F-3.5). Two local facts identify the culprit
   * instead: its liveness lock is still held, which `Worker.run` does over exactly the interval it
   * holds the storage lock, so a worker that already stood down is not killed twice nor reported;
   * and it does not answer a probe, which is what being wedged means and what keeps the lock. Every
   * healthy bystander answers, so at most the wedged worker is terminated however many tabs listen.
   */
  #onTerminateRequest(request: TerminateRequest): Promise<void> {
    // Two queued workers can each escalate over the same incumbent, and the channel does not await
    // this handler: without serialization both probes run, both kill, and one incident is reported
    // and closed twice. A check already in flight is about this same worker, so the later request
    // has nothing to add.
    this.#terminationCheck ??= this.#runTerminationCheck(request).finally(() => {
      this.#terminationCheck = undefined;
    });
    return this.#terminationCheck;
  }

  async #runTerminationCheck({ issuerId, storageLockKey, graceTimeout }: TerminateRequest): Promise<void> {
    // Our own worker raised the escalation while queued behind someone else's; terminating here
    // would have every new leader kill the worker it just started, which is the kill loop.
    if (issuerId === this.#workerId) {
      return;
    }
    if (!(await isLockHeld(this.#livenessLockKey))) {
      return;
    }
    if (!this.isOpen) {
      return;
    }
    if (await this.#isWorkerResponsive()) {
      log('leader-session: escalation is not about our worker, it is still servicing messages', {
        leaderId: this.#leaderId,
        issuerId,
      });
      return;
    }
    if (!this.isOpen) {
      return;
    }
    const context = {
      storageLockKey,
      terminatedWorkerId: this.#workerId,
      issuerId,
      graceTimeout,
      raisedBy: 'tab',
      leaderId: this.#leaderId,
    };
    if (!this.#terminateWorker()) {
      // The handle cannot stop the worker, so the locks stay held and the successor still fails;
      // reported rather than left as a silent no-op.
      log.catch(new WorkerNotTerminableError({ context }));
      return;
    }
    // Reported from the side that actually kills the worker, and only there: the escalating
    // worker runs in a thread with no observability processor attached, and a second event per
    // incident would only split the incident in the error stream.
    const error = new WorkerTerminationError({ context });
    log.catch(error);
    if (this.isOpen) {
      this.onClose.emit(error);
    }
  }

  /** Whether the worker still drains its message queue; a wedged one never answers. */
  async #isWorkerResponsive(): Promise<boolean> {
    const nonce = crypto.randomUUID();
    const replied = new Trigger();
    // Matched on the nonce, so a reply to an earlier probe cannot vouch for the worker now.
    const unsubscribe = this.#probeReplies.on((received) => {
      if (received === nonce) {
        replied.wake();
      }
    });
    try {
      this.#sendMessage({ type: 'ping', nonce });
      await asyncTimeout(replied.wait(), this.#workerProbeTimeout);
      return true;
    } catch {
      return false;
    } finally {
      unsubscribe();
    }
  }

  /** Stands the worker down without its cooperation; `false` when the handle cannot do that. */
  #terminateWorker(): boolean {
    if (!WorkerProtocol.isTerminable(this.#worker)) {
      return false;
    }
    this.#worker.terminate();
    return true;
  }

  #closeWorker() {
    if (!this.#terminateWorker() && this.#worker instanceof MessagePort) {
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

/** Settles with `promise`, or rejects as soon as `ctx` is disposed — whichever comes first. */
const untilDisposed = <T>(ctx: Context, promise: Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const removeDisposer = ctx.onDispose(() => reject(new ContextDisposedError()));
    promise.then(
      (value) => {
        removeDisposer();
        resolve(value);
      },
      (error) => {
        removeDisposer();
        reject(error);
      },
    );
  });
