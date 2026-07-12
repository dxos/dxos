//
// Copyright 2026 DXOS.org
//

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import * as Messages from '../Messages';

export type RuntimeHandle = {
  createSession(args: {
    appPort: MessagePort;
    systemPort: MessagePort;
    clientId: string;
    isOwner: boolean;
    onClose: () => Promise<void>;
  }): Promise<void>;
  /**
   * Tears down the service runtime. Invoked by the framework when the worker is displaced by a
   * newer instance or otherwise shut down. Optional and must be idempotent.
   */
  stop?(): Promise<void>;
};

export type Options = {
  /**
   * Worker endpoint. Defaults to `self` in a DedicatedWorkerGlobalScope.
   */
  endpoint?: Messages.WorkerEndpoint;
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
  }) => Promise<RuntimeHandle>;
};

const defaultEndpoint = (): Messages.WorkerEndpoint => {
  const scope = self as unknown as Messages.WorkerEndpoint & { close(): void };
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
    const tabsProcessed = new Set<string>();

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

    const handleMessage = async (ev: MessageEvent<Messages.DedicatedWorkerMessage>) => {
      const message = ev.data;
      log('worker message received', { type: message.type });
      switch (message.type) {
        case 'init': {
          owningClientId = message.ownerClientId ?? message.clientId;
          log('worker init with config', { keys: Object.keys(message.config ?? {}) });
          runtime = await createRuntime({ config: message.config, requestShutdown });
          log('dedicated-worker: runtime ready, posting ready');
          endpoint.postMessage({
            type: 'ready',
            livenessLockKey,
          } satisfies Messages.DedicatedWorkerMessage);
          break;
        }
        case 'start-session': {
          if (tabsProcessed.has(message.clientId)) {
            log('ignoring duplicate client', { clientId: message.clientId });
            break;
          }
          tabsProcessed.add(message.clientId);

          const appChannel = new MessageChannel();
          const systemChannel = new MessageChannel();

          log('dedicated-worker: posting session ports', { clientId: message.clientId });
          endpoint.postMessage(
            {
              type: 'session',
              appPort: appChannel.port1,
              systemPort: systemChannel.port1,
              clientId: message.clientId,
              isOwner: message.clientId === owningClientId,
            } satisfies Messages.DedicatedWorkerMessage,
            [appChannel.port1, systemChannel.port1],
          );

          if (!runtime) {
            log.error('start-session before init; runtime not initialized', { clientId: message.clientId });
            break;
          }
          log('dedicated-worker: creating session (waiting for handshake)', { clientId: message.clientId });
          await runtime.createSession({
            appPort: appChannel.port2,
            systemPort: systemChannel.port2,
            clientId: message.clientId,
            isOwner: message.clientId === owningClientId,
            onClose: async () => {
              log('dedicated-worker: session closed', { clientId: message.clientId });
              tabsProcessed.delete(message.clientId);
            },
          });
          log('dedicated-worker: session created', { clientId: message.clientId });
          break;
        }

        default:
          log.error('unknown message', { type: (message as { type?: string }).type });
      }
    };

    endpoint.addEventListener('message', handleMessage);
    endpoint.postMessage({ type: 'listening' } satisfies Messages.DedicatedWorkerMessage);

    await storageLockHeld;
    endpoint.removeEventListener('message', handleMessage);
  });
};
