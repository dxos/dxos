//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { Trigger } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import * as WorkerProtocol from './WorkerProtocol';

// A single MessagePort multiplexes every request by id, so allow effectively-unbounded concurrent
// requests over the one worker rather than the pool default of 1 (which lets one open stream block
// every other call).
const WORKER_CLIENT_CONCURRENCY = Number.MAX_SAFE_INTEGER;

const sessionProtocols = (clientToWorker: MessagePort, workerToClient: MessagePort) =>
  Layer.merge(
    RpcServer.layerProtocolWorkerRunner.pipe(Layer.provide(BrowserWorkerRunner.layerMessagePort(clientToWorker))),
    RpcClient.layerProtocolWorker({ size: 1, concurrency: WORKER_CLIENT_CONCURRENCY }).pipe(
      Layer.provide(BrowserWorker.layer(() => workerToClient)),
    ),
  );

export type RuntimeHandle = {
  stop?(): Promise<void>;
  createSession(args: {
    clientId: string;
    isOwner: boolean;
  }): Effect.Effect<never, never, Scope.Scope | RpcClient.Protocol | RpcServer.Protocol>;
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
   * Builds the runtime after receiving init config from the leader.
   */
  createRuntime: (args: {
    config: Record<string, any> | undefined;
    requestShutdown: () => void;
  }) => Effect.Effect<RuntimeHandle, never, Scope.Scope>;
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
  displaceChannel = `${storageLockKey}/displace`,
  createRuntime,
}: Options): void => {
  void navigator.locks.request(storageLockKey, async () => {
    log('lock acquired');

    let runtime: RuntimeHandle | undefined;
    let owningClientId: string;
    // Live session per client, keyed by the connect attempt that claimed it. `supersede` tears the
    // session down from this side — the only way to reclaim a slot whose tab abandoned it.
    const sessionsByClient = new Map<string, { attempt: number; supersede: () => void }>();

    let releaseStorageLock: () => void;
    const storageLockHeld = new Promise<void>((resolve) => {
      releaseStorageLock = resolve;
    });

    // Displace any previously-running worker for this storage lock, and shut down if displaced.
    const channel = new BroadcastChannel(displaceChannel);
    channel.postMessage({ action: 'stop' });

    // Hold a dedicated liveness lock for the worker's whole lifetime. Clients watch this key to detect
    // termination, so it must be held before `ready` is advertised — hence the awaited grant below.
    const livenessLockKey = `${storageLockKey}/liveness/${crypto.randomUUID()}`;
    let releaseLivenessLock: () => void;
    const livenessLockHeld = new Promise<void>((resolve) => {
      releaseLivenessLock = resolve;
    });
    const livenessLockGranted = new Trigger();
    void navigator.locks.request(livenessLockKey, async () => {
      livenessLockGranted.wake();
      await livenessLockHeld;
    });
    await livenessLockGranted.wait();

    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      log('worker shutting down');
      channel.close();
      try {
        await runtime?.stop?.();
      } catch (err: any) {
        log.catch(err);
      }
      endpoint.close?.();
      releaseLivenessLock();
      releaseStorageLock();
    };
    channel.onmessage = (event) => {
      if (event.data?.action === 'stop') {
        log('displaced by newer worker, shutting down');
        void shutdown();
      }
    };

    const requestShutdown = () => void shutdown();

    const handleMessage = async (ev: MessageEvent<WorkerProtocol.DedicatedWorkerMessage>) => {
      const message = ev.data;
      log('worker message received', { type: message.type });
      switch (message.type) {
        case 'init': {
          owningClientId = message.ownerClientId ?? message.clientId;
          log('worker init with config', { keys: Object.keys(message.config ?? {}) });
          runtime = await EffectEx.runPromise(
            createRuntime({ config: message.config, requestShutdown }).pipe(Effect.scoped),
          );
          log('dedicated-worker: runtime ready, posting ready');
          endpoint.postMessage({
            type: 'ready',
            livenessLockKey,
          } satisfies WorkerProtocol.DedicatedWorkerMessage);
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
              isOwner: message.clientId === owningClientId,
            } satisfies WorkerProtocol.DedicatedWorkerMessage,
            [clientToWorkerChannel.port1, workerToClientChannel.port1],
          );

          log('dedicated-worker: creating session (waiting for handshake)', { clientId: message.clientId });
          const sessionEffect = runtime
            .createSession({
              clientId: message.clientId,
              isOwner: message.clientId === owningClientId,
            })
            .pipe(
              Effect.provide(sessionProtocols(clientToWorkerChannel.port2, workerToClientChannel.port2)),
              // `createSession` blocks for the session's lifetime, so this race is what ends it early
              // when a newer attempt supersedes this one; `Effect.scoped` below then runs teardown.
              Effect.raceFirst(Effect.promise(() => superseded.wait())),
              Effect.ensuring(
                Effect.sync(() => {
                  log('dedicated-worker: session closed', { clientId: message.clientId, attempt });
                  // Guarded: a superseded session finishes after the newer attempt claimed the slot,
                  // and must not evict it.
                  if (sessionsByClient.get(message.clientId)?.attempt === attempt) {
                    sessionsByClient.delete(message.clientId);
                  }
                }),
              ),
            );
          // The session effect runs for the session's lifetime (createSession blocks until the
          // session ends), so cleanup is handled by `Effect.ensuring` above rather than a log here.
          await EffectEx.runPromise(sessionEffect.pipe(Effect.scoped));
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
};
