//
// Copyright 2026 DXOS.org
//

import { Event, Trigger, scheduleTaskInterval } from '@dxos/async';
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

const LEADER_LOCK_KEY = '@dxos/client/DedicatedWorkerClientServices/LeaderLock';

export interface DedeciatedWorkerClientServicesOptions {
  createWorker: () => WorkerOrPort;
  createCoordinator: () => MaybePromise<WorkerCoordinator>;
}
/**
 * Runs services in a dedicated worker, exposed to other tabs.
 * Leader election is used to ensure only a single worker is running.
 */
export class DedicatedWorkerClientServices extends Resource implements ClientServicesProvider {
  #createWorker: () => WorkerOrPort;
  #createCoordinator: () => MaybePromise<WorkerCoordinator>;
  #services: ClientServicesProxy | undefined = undefined;
  #leaderSession: LeaderSession | undefined = undefined;
  #coordinator: WorkerCoordinator | undefined = undefined;
  #connection: SharedWorkerConnection | undefined = undefined;
  #clientId = `dedicated-worker-client-services-${crypto.randomUUID()}`;

  #initialConnection = new Trigger<void>();
  #hasConnected = false;

  /**
   * Pending request-port messages that arrived before LeaderSession was ready.
   * These are forwarded to the LeaderSession when it becomes ready.
   */
  #pendingPortRequests: string[] = [];

  readonly closed = new Event<Error | undefined>();

  /**
   * Emitted when connection to the leader is lost, BEFORE old services are closed.
   * Clients should listen to this event to stop using services immediately.
   */
  readonly disconnecting = new Event<void>();

  /**
   * Emitted when services have reconnected to a new leader.
   * Clients should listen to this event to reinitialize their service bindings.
   */
  readonly reconnected = new Event<void>();

  constructor(options: DedeciatedWorkerClientServicesOptions) {
    super();
    this.#createWorker = options.createWorker;
    this.#createCoordinator = options.createCoordinator;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get services(): Partial<ClientServices> {
    invariant(this.#services, 'services not initialized');
    return this.#services.services;
  }

  override async _open(): Promise<void> {
    this.#coordinator = await this.#createCoordinator();

    // Listen for request-port messages. If we are the leader and ready, handle them.
    // Otherwise, queue them for when we become the leader.
    this.#coordinator.onMessage.on(this._ctx, (msg) => {
      if (msg.type === 'request-port') {
        if (this.#leaderSession?.isReady) {
          this.#leaderSession.handleRequestPort(msg.clientId);
        } else {
          // Queue for when LeaderSession becomes ready.
          log.info('queueing request-port (leader not ready)', { clientId: msg.clientId });
          this.#pendingPortRequests.push(msg.clientId);
        }
      }
    });

    this.#watchLeader();
    this.#reconnectLoop();
    await this.#initialConnection.wait();
  }

  override async _close(): Promise<void> {
    await this.#services?.close();
    await this.#connection?.close();
    await this.#leaderSession?.close();
  }

  /**
   * Waits until this client becomes a leader and starts the worker.
   */
  #watchLeader() {
    queueMicrotask(async () => {
      try {
        await navigator.locks.request(LEADER_LOCK_KEY, { mode: 'exclusive', signal: this._ctx.signal }, async () => {
          // I am the leader now.
          invariant(this.#coordinator);
          invariant(!this.#leaderSession);
          this.#leaderSession = new LeaderSession(this.#createWorker, this.#coordinator);
          const done = new Trigger();
          this._ctx.onDispose(() => done.wake());
          this.#leaderSession.onClose.on((error) => {
            this.#leaderSession = undefined;
            if (error) {
              done.throw(error);
            } else {
              done.wake();
            }
          });
          // When LeaderSession becomes ready, process any pending port requests.
          this.#leaderSession.onReady.on(() => {
            for (const clientId of this.#pendingPortRequests) {
              this.#leaderSession?.handleRequestPort(clientId);
            }
            this.#pendingPortRequests = [];
          });
          await this.#leaderSession.open();
          await done.wait(); // Hold until the leader session is closed.
        });
      } catch (error: any) {
        if (isAbortError(error)) {
          return;
        }
        log.catch(error);
      }
    });
  }

  /**
   * Constantly reconnects as the leader changes.
   */
  #reconnectLoop() {
    queueMicrotask(async () => {
      while (true) {
        if (this._ctx.disposed) {
          break;
        }

        const leaderStopped = new Trigger();

        try {
          // Generate a fresh clientId for each connection attempt.
          // This prevents "ignoring duplicate client" errors when reconnecting,
          // since the worker tracks clientIds and rejects duplicates.
          this.#clientId = `dedicated-worker-client-services-${crypto.randomUUID()}`;
          log.info('trying to connect', { clientId: this.#clientId });
          await using ctx = this._ctx.derive();

          // Use a separate context for the connection phase so we can stop the retry interval
          // once provide-port is received, without disposing the main ctx for this iteration.
          const connectionCtx = ctx.derive();
          const { appPort, systemPort, leaderId, livenessLockKey } = await new Promise<
            WorkerCoordinatorMessage & { type: 'provide-port' }
          >((resolve) => {
            invariant(this.#coordinator);
            // Register listener WITH ctx so it's cleaned up when this iteration ends.
            // This prevents old listeners from receiving messages meant for new iterations.
            this.#coordinator.onMessage.on(ctx, (message) => {
              if (message.type === 'provide-port' && message.clientId === this.#clientId) {
                log.info('reconnectLoop received provide-port', { leaderId: message.leaderId });
                // Stop the retry interval now that we have a connection.
                void connectionCtx.dispose();
                resolve(message);
              }
            });
            this.#coordinator.sendMessage({
              type: 'request-port',
              clientId: this.#clientId,
            });
            scheduleTaskInterval(
              connectionCtx,
              async () => {
                this.#coordinator?.sendMessage({
                  type: 'request-port',
                  clientId: this.#clientId,
                });
              },
              500,
            );
          });
          log.info('connected to worker', { leaderId });

          queueMicrotask(async () => {
            try {
              // Small delay to ensure the worker has time to acquire the liveness lock.
              // Without this, there's a race condition where we might acquire the lock
              // before the worker does, incorrectly thinking the worker is dead.
              await new Promise((resolve) => setTimeout(resolve, 100));
              await navigator.locks.request(livenessLockKey, { mode: 'exclusive', signal: ctx.signal }, async () => {
                leaderStopped.wake();
              });
            } catch (err: any) {
              if (isAbortError(err)) {
                return;
              }
              log.catch(err);
            }
          });
          this.#coordinator!.onMessage.on(ctx, (msg) => {
            if (msg.type === 'new-leader' && msg.leaderId !== leaderId) {
              leaderStopped.wake();
            }
          });

          this.#connection = new SharedWorkerConnection({
            // TODO(dmaretskyi): Config management.
            config: new Config(),
            systemPort: createWorkerPort({ port: systemPort }),
          });
          log('opening SharedWorkerConnection');
          await this.#connection.open({
            origin: typeof location !== 'undefined' ? location.origin : 'unknown',
          });
          log('opened SharedWorkerConnection');

          this.#services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
          await this.#services.open();

          if (!this.#hasConnected) {
            this.#hasConnected = true;
            this.#initialConnection.wake();
          } else {
            // Reconnection - notify Client so it can reinitialize with new services.
            // We use a separate `reconnected` event (not `closed`) because `closed` causes
            // the Client to close services, which we don't want during reconnection.
            log.info('services reconnected, notifying client to reinitialize');
            this.reconnected.emit();
          }

          // Wait until the leader stops.
          // IMPORTANT: This must be inside the try block so ctx remains active
          // and the new-leader listener and liveness lock can wake leaderStopped.
          await leaderStopped.wait();
          log.info('lost connection');

          // Notify clients to stop using services BEFORE we close them.
          // This prevents RpcClosedError from operations in flight.
          this.disconnecting.emit();
        } catch (err: any) {
          this.#initialConnection.throw(err);
          log.catch(err);
          continue;
        }
      }
    });
  }
}

/**
 * Represents a tab becoming a leader and running the worker.
 */
class LeaderSession extends Resource {
  #createWorker: () => WorkerOrPort;
  #coordinator: WorkerCoordinator;
  #worker!: WorkerOrPort;
  #leaderId = `leader-${crypto.randomUUID()}`;
  #livenessLockKey: string | undefined;
  #isReady = false;

  constructor(createWorker: () => WorkerOrPort, coordinator: WorkerCoordinator) {
    super();
    this.#createWorker = createWorker;
    this.#coordinator = coordinator;
  }

  readonly onClose = new Event<Error | undefined>();
  readonly onReady = new Event<void>();

  get isReady(): boolean {
    return this.#isReady;
  }

  /**
   * Handle a request-port message from a client.
   */
  handleRequestPort(clientId: string): void {
    if (!this.#isReady) {
      log.warn('handleRequestPort called before ready');
      return;
    }
    this.#sendMessage({ type: 'start-session', clientId });
  }

  protected override async _open(_ctx: Context): Promise<void> {
    log('creating worker');
    this.#worker = this.#createWorker();
    const listening = new Trigger();
    const ready = new Trigger<DedicatedWorkerReadyMessage>();
    this.#worker!.onmessage = (event: MessageEvent<DedicatedWorkerMessage>) => {
      log.info('leader got message', { type: event.data.type });
      switch (event.data.type) {
        case 'listening':
          listening.wake();
          break;
        case 'ready':
          ready.wake(event.data);
          break;
        case 'session':
          invariant(this.#livenessLockKey, 'livenessLockKey must be set before session message');
          log.info('sending provide-port', { clientId: event.data.clientId, leaderId: this.#leaderId });
          this.#coordinator.sendMessage({
            type: 'provide-port',
            appPort: event.data.appPort,
            systemPort: event.data.systemPort,
            clientId: event.data.clientId,
            leaderId: this.#leaderId,
            livenessLockKey: this.#livenessLockKey,
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

    // Register coordinator listener for messages we need to handle.
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
        case 'request-port':
          // request-port is now handled by DedicatedWorkerClientServices.
          break;
        default:
          log.error('unknown message', { type: msg });
      }
    });

    log.info('waiting for worker to start listening');
    await listening.wait();
    this.#sendMessage({ type: 'init', clientId: this.#leaderId });
    log.info('waiting for worker to be ready');
    const { livenessLockKey } = await ready.wait();
    this.#livenessLockKey = livenessLockKey;
    log.info('leader ready');

    // Listen for worker termination.
    void navigator.locks.request(livenessLockKey, () => {
      log.info('worker terminated');
      if (this.isOpen) {
        this.onClose.emit(new Error('Dedicated worker terminated.'));
      }
    });

    // Mark as ready and emit event so parent can process pending requests.
    this.#isReady = true;
    this.onReady.emit();

    this.#coordinator.sendMessage({
      type: 'new-leader',
      leaderId: this.#leaderId,
    });
  }

  protected override async _close(): Promise<void> {
    if (isWorker(this.#worker)) {
      this.#worker?.terminate();
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

const isAbortError = (error: Error) => {
  return error.name === 'AbortError';
};
