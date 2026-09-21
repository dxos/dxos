//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { Trigger } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import { type BaseError } from '@dxos/errors';
import { log } from '@dxos/log';

import { DisplaceChannel, displaceChannelFor } from './internal/displace-channel.ts';
import * as WorkerProtocol from './WorkerProtocol.ts';

// A single MessagePort multiplexes every request by id, so allow effectively-unbounded concurrent
// requests over the one worker rather than the pool default of 1 (which lets one open stream block
// every other call).
const WORKER_CLIENT_CONCURRENCY = Number.MAX_SAFE_INTEGER;

/**
 * How long a starting worker waits for the incumbent to release the storage lock cooperatively
 * before escalating to its tab.
 *
 * Killing a worker that was merely slow is the cost of being wrong, so the window is as long as it
 * can be: it must stay strictly below `LOCK_OR_RPC_WAIT_TIMEOUT` (15s), because the escalating
 * worker is itself terminated by its tab the moment that budget expires — a grace period at or
 * above it never fires at all — leaving the remainder for the terminate, the lock grant and the
 * handshake that follow.
 */
export const DEFAULT_DISPLACE_GRACE_TIMEOUT = 10_000;

/**
 * Shuts down whichever worker currently holds `storageLockKey`, so its storage can be taken over.
 * A worker does this to its predecessor on startup; a caller rewriting the storage from outside
 * does it to free the lock, and must still wait for the lock itself — this only asks.
 */
export const displace = (storageLockKey: string, displaceChannel = displaceChannelFor(storageLockKey)): void => {
  const channel = new DisplaceChannel(displaceChannel);
  try {
    channel.postStop();
  } finally {
    channel.close();
  }
};

const sessionProtocols = (clientToWorker: MessagePort, workerToClient: MessagePort) =>
  Layer.merge(
    RpcServer.layerProtocolWorkerRunner.pipe(Layer.provide(BrowserWorkerRunner.layerMessagePort(clientToWorker))),
    RpcClient.layerProtocolWorker({ size: 1, concurrency: WORKER_CLIENT_CONCURRENCY }).pipe(
      Layer.provide(BrowserWorker.layer(() => workerToClient)),
    ),
  );

/**
 * What {@link Options.createRuntime} returns: the worker-specific side of the session protocol.
 */
export type RuntimeHandle = {
  /**
   * Acquires the resources that serve one tab (RPC servers, clients) into the provided scope and
   * returns; it does not wait for the session to end. The scope is the session's lifetime: the
   * framework closes it when the tab's session lock releases (the tab closed or died), when a newer
   * connect attempt from the same tab supersedes this one, or when the worker shuts down. The
   * protocols in context are the tab→worker server transport and the worker→tab client transport,
   * built into the same scope.
   */
  createSession(args: {
    clientId: string;
    isOwner: boolean;
  }): Effect.Effect<void, never, Scope.Scope | RpcClient.Protocol | RpcServer.Protocol>;
};

export type Options = {
  /**
   * Worker endpoint. Defaults to `self` in a DedicatedWorkerGlobalScope.
   */
  endpoint?: WorkerProtocol.WorkerEndpoint;
  /**
   * Web Lock key gating storage ownership for a single worker instance.
   */
  storageLockKey: string;
  /**
   * BroadcastChannel name used to displace a previously-running worker for the same storage lock.
   * Defaults to a name derived from {@link storageLockKey}.
   */
  displaceChannel?: string;
  /**
   * How long to wait, after asking the incumbent worker for this storage lock to stand down, before
   * escalating to the tab that owns it. Defaults to {@link DEFAULT_DISPLACE_GRACE_TIMEOUT}.
   */
  displaceGraceTimeout?: number;
  /**
   * Ends the worker the way terminating its agent would: a pending storage-lock request is dropped
   * and a running worker shuts down. For hosts that run the loop in-process (tests, a native shell).
   */
  signal?: AbortSignal;
  /**
   * Builds the runtime after receiving init config from the leader. The provided scope is the
   * runtime's lifetime: it stays open until the worker shuts down (displaced by a newer worker, or
   * `requestShutdown` called), and every session scope is a child of it, so shutdown closes the
   * sessions first and then the runtime. Put the runtime's teardown in its finalizers. A failure is reported
   * to the leader as `init-failed` and shuts the worker down.
   */
  createRuntime: (args: {
    config: Record<string, any> | undefined;
    requestShutdown: () => void;
  }) => Effect.Effect<RuntimeHandle, BaseError, Scope.Scope>;
};

const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {
  const scope = self as unknown as WorkerProtocol.WorkerEndpoint & { close(): void };
  return {
    postMessage: (message, transfer) => scope.postMessage(message, transfer),
    addEventListener: (type, listener) => scope.addEventListener(type, listener),
    removeEventListener: (type, listener) => scope.removeEventListener(type, listener),
    close: () => scope.close(),
  };
};

/**
 * Runs the generic dedicated-worker message loop: storage lock, liveness lock, displacement of prior
 * workers, the init/ready/session protocol, session deduplication, and owner detection.
 *
 * Liveness and displacement are owned by the framework: the worker holds a dedicated liveness Web Lock
 * for its whole lifetime (released on shutdown so clients observe termination), and broadcasts a stop
 * signal on startup so any previous worker for the same storage lock tears down.
 */
export const run = ({
  endpoint = defaultEndpoint(),
  storageLockKey,
  displaceChannel = displaceChannelFor(storageLockKey),
  displaceGraceTimeout = DEFAULT_DISPLACE_GRACE_TIMEOUT,
  signal,
  createRuntime,
}: Options): void => {
  // Identifies this worker to the tab that owns it, so an escalation this worker raised cannot come
  // back as an order to terminate it.
  const workerId = crypto.randomUUID();
  // Displacement is a worker-to-worker handshake, so the channel listens and the stop signal goes out
  // before this worker queues on the storage lock: the incumbent releases that lock only when it is
  // displaced, and a signal broadcast after the grant can never reach the worker being waited on.
  const channel = new DisplaceChannel(displaceChannel);
  // Replaced by `shutdown` the moment the lock is granted; until then a displace only records that a
  // newer worker exists, since a worker serving nothing has nothing to stand down from.
  let displaced = false;
  channel.onStop = () => {
    displaced = true;
  };
  channel.postStop();
  // Second level, for an incumbent wedged badly enough not to service the channel at all (a busy CPU
  // loop being the clearest case): it never runs `shutdown`, so it releases neither the liveness nor
  // the storage lock, and only the tab holding its `Worker` handle can free them. Fires at most once
  // per worker start, and never once the lock has been granted.
  const escalation = setTimeout(() => {
    log.warn('displaced worker still holds the storage lock, escalating to its tab', {
      storageLockKey,
      graceTimeout: displaceGraceTimeout,
    });
    channel.postTerminate({ issuerId: workerId, storageLockKey, graceTimeout: displaceGraceTimeout });
  }, displaceGraceTimeout);

  // Set once the storage lock is held; a lock stolen from under this worker ends it through here.
  let shutdownOnLockLost: (() => Promise<void>) | undefined;
  const onLockLost = (lockName: string) => (err: unknown) => {
    if (signal?.aborted) {
      return;
    }
    // A holder whose lock was stolen keeps running, but its storage is no longer its own to serve.
    log.warn('worker lock lost, shutting down', { lockName, err });
    void shutdownOnLockLost?.();
  };
  // Aborting a granted request leaves the lock held, so a running worker is shut down explicitly; a
  // worker that never got the lock only has its channel to release.
  signal?.addEventListener(
    'abort',
    () => {
      // The channel is about to close, and posting an escalation on a closed BroadcastChannel throws.
      clearTimeout(escalation);
      if (shutdownOnLockLost) {
        void shutdownOnLockLost();
      } else {
        channel.close();
      }
    },
    { once: true },
  );
  const storageLock = navigator.locks.request(storageLockKey, { signal }, async () => {
    log('lock acquired');
    clearTimeout(escalation);

    let runtime: RuntimeHandle | undefined;
    // The runtime's lifetime (see `Options.createRuntime`); every session scope is forked from it.
    const runtimeScope = Effect.runSync(Scope.make());
    let owningClientId: string;
    // Live session per client, keyed by the connect attempt that claimed it. `supersede` tears the
    // session down from this side — the only way to reclaim a slot whose tab abandoned it.
    const sessionsByClient = new Map<string, { attempt: number; supersede: () => void }>();

    let releaseStorageLock: () => void;
    const storageLockHeld = new Promise<void>((resolve) => {
      releaseStorageLock = resolve;
    });

    // Hold a dedicated liveness lock for the worker's whole lifetime. Clients watch this key to detect
    // termination, so it must be held before `ready` is advertised — hence the awaited grant below.
    const livenessLockKey = `${storageLockKey}/liveness/${workerId}`;
    let releaseLivenessLock: () => void;
    const livenessLockHeld = new Promise<void>((resolve) => {
      releaseLivenessLock = resolve;
    });
    const livenessLockGranted = new Trigger();
    const livenessLock = navigator.locks.request(livenessLockKey, async () => {
      livenessLockGranted.wake();
      await livenessLockHeld;
    });
    void livenessLock.catch(onLockLost(livenessLockKey));

    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      log('worker shutting down');
      channel.close();
      await EffectEx.runPromise(Scope.close(runtimeScope, Exit.void)).catch((err) => log.catch(err));
      endpoint.close?.();
      releaseLivenessLock();
      releaseStorageLock();
    };
    shutdownOnLockLost = shutdown;
    // Set before the first await, so a displace arriving while this worker starts up cannot land in a
    // gap and leave it holding the storage lock a displacer is waiting on.
    channel.onStop = () => {
      log('displaced by newer worker, shutting down');
      void shutdown();
    };
    if (displaced) {
      // A newer worker broadcast while this one queued: it is waiting behind us on the storage lock,
      // and serving here would strand it for the leader session's whole budget.
      log('displaced while waiting for the storage lock, not serving');
      // Through `shutdown` rather than closing the channel alone, so the liveness lock is released:
      // clients watch that key to detect termination and would otherwise see this worker as alive.
      await shutdown();
      return;
    }

    await livenessLockGranted.wait();
    if (shuttingDown) {
      // Displaced before startup finished: `shutdown` has released both locks, so there is nothing
      // to serve and advertising `listening` would hand out a session this worker cannot keep.
      log('displaced during startup, not serving');
      return;
    }

    const requestShutdown = () => void shutdown();

    const handleMessage = async (ev: MessageEvent<WorkerProtocol.DedicatedWorkerMessage>) => {
      const message = ev.data;
      log('worker message received', { type: message.type });
      switch (message.type) {
        case 'init': {
          owningClientId = message.ownerClientId ?? message.clientId;
          log('worker init with config', { keys: Object.keys(message.config ?? {}) });
          try {
            runtime = await EffectEx.runPromise(
              createRuntime({ config: message.config, requestShutdown }).pipe(Scope.provide(runtimeScope)),
            );
          } catch (err) {
            // A worker with no runtime serves nothing, so it reports why and exits instead of advertising `ready`.
            log.error('dedicated-worker: runtime failed to start', { err });
            endpoint.postMessage({
              type: 'init-failed',
              error: WorkerProtocol.encodeError(err),
            } satisfies WorkerProtocol.DedicatedWorkerMessage);
            await shutdown();
            break;
          }
          log('dedicated-worker: runtime ready, posting ready');
          endpoint.postMessage({
            type: 'ready',
            livenessLockKey,
            workerId,
            displaceChannel,
          } satisfies WorkerProtocol.DedicatedWorkerMessage);
          break;
        }
        case 'ping': {
          // Answered from the message loop itself, so the reply is proof that this worker is still
          // draining its queue — the one thing that distinguishes it from a wedged incumbent.
          endpoint.postMessage({ type: 'pong', nonce: message.nonce } satisfies WorkerProtocol.DedicatedWorkerMessage);
          break;
        }
        case 'start-session': {
          // Absent on a client that predates the field; 0 then reproduces the old first-wins de-dupe.
          const attempt = message.attempt ?? 0;
          const current = sessionsByClient.get(message.clientId);
          // Same (or older) attempt: a raced re-request for a session that already exists, e.g. the
          // heartbeat-driven re-request a follower sends until its ports arrive.
          if (current && attempt <= current.attempt) {
            log('ignoring duplicate client', { clientId: message.clientId, attempt });
            break;
          }
          // Validate the runtime before mutating any session state: a `start-session` can race an
          // in-flight `init` (whose handler awaits `createRuntime` before setting `runtime`). Claiming
          // the slot or posting ports here would hand out a session nobody serves and permanently
          // wedge the client (future retries hit "ignoring duplicate client").
          if (!runtime) {
            log.error('start-session before init; runtime not initialized', { clientId: message.clientId });
            break;
          }
          // Heartbeat-driven re-requests keep arriving while the runtime tears down, and a session
          // forked from the closing scope would hand out ports nobody serves.
          if (shuttingDown) {
            log('ignoring start-session while shutting down', { clientId: message.clientId });
            break;
          }
          // A newer attempt means the tab gave up on the session it already holds — its connect failed
          // after we handed out ports, so nothing on that side will ever close it. Tear it down here
          // or the clientId stays claimed for the worker's lifetime and every retry is discarded.
          if (current) {
            log.warn('superseding abandoned session', { clientId: message.clientId, attempt });
            current.supersede();
          }
          const superseded = new Trigger();
          sessionsByClient.set(message.clientId, { attempt, supersede: () => superseded.wake() });

          const clientToWorkerChannel = new MessageChannel();
          const workerToClientChannel = new MessageChannel();

          log('dedicated-worker: posting session ports', { clientId: message.clientId });
          endpoint.postMessage(
            {
              type: 'session',
              clientToWorker: clientToWorkerChannel.port1,
              workerToClient: workerToClientChannel.port1,
              clientId: message.clientId,
              attempt,
              isOwner: message.clientId === owningClientId,
            } satisfies WorkerProtocol.DedicatedWorkerMessage,
            [clientToWorkerChannel.port1, workerToClientChannel.port1],
          );

          // The session's lifetime (see `RuntimeHandle.createSession`): a child of the runtime scope,
          // closed below when the tab's session lock releases or a newer attempt supersedes this one.
          const sessionScope = await EffectEx.runPromise(Scope.fork(runtimeScope));
          const closeSession = async () => {
            await EffectEx.runPromise(Scope.close(sessionScope, Exit.void)).catch((err) => log.catch(err));
            log('dedicated-worker: session closed', { clientId: message.clientId, attempt });
            // Guarded: a superseded session finishes after the newer attempt claimed the slot,
            // and must not evict it.
            if (sessionsByClient.get(message.clientId)?.attempt === attempt) {
              sessionsByClient.delete(message.clientId);
            }
          };

          log('dedicated-worker: creating session', { clientId: message.clientId });
          try {
            await EffectEx.runPromise(
              Effect.gen(function* () {
                const protocols = yield* Layer.build(
                  sessionProtocols(clientToWorkerChannel.port2, workerToClientChannel.port2),
                );
                yield* runtime!
                  .createSession({ clientId: message.clientId, isOwner: message.clientId === owningClientId })
                  .pipe(Effect.provide(protocols));
              }).pipe(Scope.provide(sessionScope)),
            );
          } catch (err) {
            log.catch(err);
            await closeSession();
            log('dedicated-worker: reporting failed session', { clientId: message.clientId, attempt });
            endpoint.postMessage({
              type: 'session-failed',
              clientId: message.clientId,
              attempt,
              error: WorkerProtocol.encodeError(err),
            } satisfies WorkerProtocol.DedicatedWorkerMessage);
            break;
          }

          // Aborted when a newer attempt supersedes this session: an un-cancelled request stays
          // queued on the tab's lock for the worker's life, and would run `closeSession` against an
          // already-closed scope whenever the tab finally released it.
          const tabGoneAbort = new AbortController();
          const tabGone = message.sessionLockKey
            ? navigator.locks
                .request(message.sessionLockKey, { signal: tabGoneAbort.signal }, () => {
                  // Granted once the tab releases it.
                })
                .catch((err) => {
                  if (err?.name !== 'AbortError') {
                    throw err;
                  }
                  return new Promise<never>(() => {});
                })
            : new Promise<never>(() => {});
          // The rejection path is explicit: `navigator.locks.request` can reject on its own (an
          // opaque origin, the lock manager going away), and an unhandled one would leave the session
          // open for the worker's life.
          void Promise.race([superseded.wait().then(() => tabGoneAbort.abort()), tabGone]).then(closeSession, (err) => {
            log.catch(err);
            void closeSession();
          });
          break;
        }

        default:
          log.error('unknown message', { type: (message as { type?: string }).type });
      }
    };

    endpoint.addEventListener('message', handleMessage);
    endpoint.postMessage({ type: 'listening' } satisfies WorkerProtocol.DedicatedWorkerMessage);

    await storageLockHeld;
    endpoint.removeEventListener('message', handleMessage);
  });
  void storageLock.catch((err) => {
    // The request ended without ever entering its callback, so nothing else disarms the escalation.
    clearTimeout(escalation);
    onLockLost(storageLockKey)(err);
  });
};
