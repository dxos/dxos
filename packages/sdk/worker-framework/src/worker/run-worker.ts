//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import type { DedicatedWorkerMessage, WorkerEndpoint } from '../internal/messages';

export type WorkerRuntimeHandle = {
  livenessLockKey: string;
  createSession(args: {
    appPort: MessagePort;
    systemPort: MessagePort;
    clientId: string;
    isOwner: boolean;
    onClose: () => Promise<void>;
  }): Promise<void>;
};

export type RunWorkerOptions = {
  /**
   * Worker endpoint. Defaults to `self` in a DedicatedWorkerGlobalScope.
   */
  endpoint?: WorkerEndpoint;
  /**
   * Web Lock key gating storage ownership for a single worker instance.
   */
  storageLockKey: string;
  /**
   * Builds the runtime after receiving init config from the leader.
   */
  createRuntime: (args: {
    config: Record<string, any> | undefined;
    requestShutdown: () => void;
  }) => Promise<WorkerRuntimeHandle>;
};

const defaultEndpoint = (): WorkerEndpoint => {
  const scope = self as unknown as WorkerEndpoint & { close(): void };
  return {
    postMessage: (message, transfer) => scope.postMessage(message, transfer),
    addEventListener: (type, listener) => scope.addEventListener(type, listener),
    removeEventListener: (type, listener) => scope.removeEventListener(type, listener),
    close: () => scope.close(),
  };
};

/**
 * Runs the generic dedicated-worker message loop: storage lock, init/ready/session protocol,
 * session deduplication, and owner detection.
 */
export const runWorker = ({ endpoint = defaultEndpoint(), storageLockKey, createRuntime }: RunWorkerOptions): void => {
  void navigator.locks.request(storageLockKey, async () => {
    log('lock acquired');

    let runtime: WorkerRuntimeHandle;
    let owningClientId: string;
    const tabsProcessed = new Set<string>();

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const requestShutdown = () => {
      endpoint.close?.();
      releaseLock();
    };

    const handleMessage = async (ev: MessageEvent<DedicatedWorkerMessage>) => {
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
            livenessLockKey: runtime.livenessLockKey,
          } satisfies DedicatedWorkerMessage);
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
            } satisfies DedicatedWorkerMessage,
            [appChannel.port1, systemChannel.port1],
          );

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
    endpoint.postMessage({ type: 'listening' } satisfies DedicatedWorkerMessage);

    await lockPromise;
    endpoint.removeEventListener('message', handleMessage);
  });
};
