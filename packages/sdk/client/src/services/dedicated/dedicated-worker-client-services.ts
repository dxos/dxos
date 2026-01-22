//
// Copyright 2026 DXOS.org
//

import { AsyncTask, Event, Trigger, scheduleTaskInterval } from '@dxos/async';
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
  /**
   * Config to pass to the dedicated worker.
   */
  config?: Config;
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
    this.#watchLeader();
    this.#connectTask.open(this._ctx);
    await this.#connectTask.runBlocking();
    await this.#initialConnection.wait();
  }

  override async _close(): Promise<void> {
    await this.#connectTask.close();
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
          this.#leaderSession = new LeaderSession(this.#createWorker, this.#coordinator, this.#config, this.#clientId);
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

  #connectTask = new AsyncTask(async () => {
    const ctx = this._ctx.derive();

    const handleLeaderStopped = async () => {
      await ctx.dispose();
      log.info('lost connection');

      // Close old services/connection before reconnecting.
      await this.#services?.close();
      await this.#connection?.close();
      this.#services = undefined;
      this.#connection = undefined;

      this.#connectTask?.schedule();
    };

    try {
      log.info('trying to connect');
      const pollingCtx = ctx.derive();
      const { appPort, systemPort, leaderId, livenessLockKey } = await new Promise<
        WorkerCoordinatorMessage & { type: 'provide-port' }
      >((resolve) => {
        invariant(this.#coordinator);
        const unsubscribe = this.#coordinator.onMessage.on((message) => {
          if (message.type === 'provide-port' && message.clientId === this.#clientId) {
            void pollingCtx.dispose();
            unsubscribe();
            resolve(message);
          }
        });
        this.#coordinator.sendMessage({
          type: 'request-port',
          clientId: this.#clientId,
        });
        scheduleTaskInterval(
          pollingCtx,
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
      await this.#connection.open({
        origin: typeof location !== 'undefined' ? location.origin : 'unknown',
      });
      log('opened SharedWorkerConnection');

      this.#services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
      await this.#services.open();

      if (this.#isInitialConnection) {
        this.#isInitialConnection = false;
        this.#initialConnection.wake();
      } else {
        // Call all reconnection callbacks and wait for them to complete.
        log.info('reconnecting, calling callbacks');
        await Promise.all(this.#reconnectCallbacks.map((cb) => cb()));
        log.info('reconnected');
        this.reconnected.emit();
      }
    } catch (err: any) {
      this.#initialConnection.throw(err);
      log.catch(err);
      void ctx.dispose();
      this.#connectTask?.schedule();
    }
  });
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

    log.info('waiting for worker to start listening');
    await listening.wait();
    this.#sendMessage({
      type: 'init',
      clientId: this.#leaderId,
      ownerClientId: this.#ownerClientId,
      config: this.#config?.values,
    });
    log.info('waiting for worker to be ready');
    const { livenessLockKey } = await ready.wait();
    log.info('leader ready');

    // Listen for worker termination.
    void navigator.locks.request(livenessLockKey, () => {
      log.info('worker terminated');
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
