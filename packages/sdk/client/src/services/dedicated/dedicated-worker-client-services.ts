import { Event, scheduleTaskInterval, Trigger } from '@dxos/async';
import { clientServiceBundle, type ClientServices, type ClientServicesProvider } from '@dxos/client-protocol';
import type { ServiceBundle } from '@dxos/rpc';
import { ClientServicesProxy } from '../service-proxy';
import { Context, Resource } from '@dxos/context';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import {
  DedicatedWorkerSessionMessage,
  type DedicatedWorkerInitMessage,
  type DedicatedWorkerMessage,
  type DedicatedWorkerReadyMessage,
  type WorkerCoordinator,
  type WorkerCoordinatorMessage,
} from './types';
import { log } from '@dxos/log';
import { Worker } from '@dxos/isomorphic-worker';
import { SharedWorkerConnection } from '../shared-worker-connection';
import { Config } from '@dxos/config';
import type { MaybePromise } from '@dxos/util';
import { invariant } from '@dxos/invariant';
import { schedule } from 'effect/Stream';
import { ScheduleInterval } from 'effect';
import { AbortedError } from '@dxos/errors';

export type WorkerOrPort = Worker | MessagePort;

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
  #services!: ClientServicesProxy;
  #leaderSession?: LeaderSession = undefined;
  #coordinator?: WorkerCoordinator = undefined;
  #connection!: SharedWorkerConnection;
  readonly #clientId = `dedicated-worker-client-services-${crypto.randomUUID()}`;

  readonly closed = new Event<Error | undefined>();

  constructor(options: DedeciatedWorkerClientServicesOptions) {
    super();
    this.#createWorker = options.createWorker;
    this.#createCoordinator = options.createCoordinator;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get services(): Partial<ClientServices> {
    return this.#services.services;
  }

  override async _open(): Promise<void> {
    this.#coordinator = await this.#createCoordinator();
    this.#watchLeader();

    await using ctx = new Context();
    const { appPort, systemPort, leaderId, livenessLockKey } = await new Promise<
      WorkerCoordinatorMessage & { type: 'provide-port' }
    >((resolve) => {
      this.#coordinator!.onMessage.on((message) => {
        if (message.type === 'provide-port' && message.clientId === this.#clientId) {
          resolve(message);
        }
      });
      this.#coordinator?.sendMessage({
        type: 'request-port',
        clientId: this.#clientId,
      });
      scheduleTaskInterval(
        ctx,
        async () => {
          this.#coordinator?.sendMessage({
            type: 'request-port',
            clientId: this.#clientId,
          });
        },
        100,
      );
    });
    log.info('connected to worker', { leaderId });

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
  }

  override async _close(): Promise<void> {
    await this.#services.close();
    await this.#connection.close();
    await this.#leaderSession?.close();
  }

  #watchLeader() {
    queueMicrotask(async () => {
      try {
        await navigator.locks.request(LEADER_LOCK_KEY, { mode: 'exclusive', signal: this._ctx.signal }, async () => {
          // I am the leader now.
          invariant(this.#coordinator);
          invariant(!this.#leaderSession);
          this.#leaderSession = new LeaderSession(this.#createWorker, this.#coordinator, this.#clientId);
          const done = new Trigger();
          this._ctx.onDispose(() => done.wake());
          this.#leaderSession.onClose.on((error) => {
            this.closed.emit(error);
            this.#leaderSession = undefined;
            done.wake();
          });
          await this.#leaderSession.open();
          await done.wait(); // Hold until the leader session is closed.
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        log.catch(error);
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
  #clientId: string;

  constructor(createWorker: () => WorkerOrPort, coordinator: WorkerCoordinator, clientId: string) {
    super();
    this.#createWorker = createWorker;
    this.#coordinator = coordinator;
    this.#clientId = clientId;
  }

  readonly onClose = new Event<Error | undefined>();

  protected override async _open(_ctx: Context): Promise<void> {
    log('creating worker');
    this.#worker = this.#createWorker();

    const { livenessLockKey } = await new Promise<DedicatedWorkerReadyMessage>((resolve, reject) => {
      this.#worker!.onmessage = (event: MessageEvent<DedicatedWorkerMessage>) => {
        log.info('leader got message', { type: event.data.type });
        switch (event.data.type) {
          case 'ready':
            resolve(event.data);
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
      if (this.#worker instanceof Worker) {
        this.#worker.onerror = (e) => {
          reject(e.error);
        };
      }
      this.#sendMessage({ type: 'init', clientId: this.#leaderId });
    });

    log.info('got worker ports');
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
    if (this.#worker instanceof Worker) {
      this.#worker?.terminate();
    } else if (this.#worker instanceof MessagePort) {
      this.#worker.close();
    }
  }

  #sendMessage(msg: DedicatedWorkerMessage) {
    this.#worker.postMessage(msg);
  }
}
