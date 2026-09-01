//
// Copyright 2026 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, Rpc, serveBridgeService } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import type { MaybePromise } from '@dxos/util';
import { WorkerProtocol } from '@dxos/worker-framework';
import * as Client from '@dxos/worker-framework/Client';

import { ClientServicesProxy } from '../service-proxy.ts';

export const LEADER_LOCK_KEY = '@dxos/client/DedicatedWorkerClientServices/LeaderLock';

export type LeaderTimeoutOptions = Client.LeaderTimeouts;

export interface DedicatedWorkerClientServicesOptions {
  createWorker: () => WorkerProtocol.WorkerOrPort;
  createCoordinator: () => MaybePromise<WorkerProtocol.WorkerCoordinator>;
  config?: Config;
  leaderTimeouts?: LeaderTimeoutOptions;
  /** See {@link Client.Options.onPersistentFailure}. */
  onPersistentFailure?: Client.Options['onPersistentFailure'];
}

/**
 * Runs services in a dedicated worker, exposed to other tabs.
 * Leader election is used to ensure only a single worker is running.
 */
export class DedicatedWorkerClientServices extends Resource implements ClientServicesProvider {
  readonly #connection: Client.Connection;
  #services: ClientServicesProxy | undefined;
  #bridgeServer: Rpc.GroupServer | undefined;
  #releaseTabLock: (() => void) | undefined;

  constructor(options: DedicatedWorkerClientServicesOptions) {
    super();
    this.#connection = new Client.Connection({
      createWorker: options.createWorker,
      createCoordinator: options.createCoordinator,
      leaderLockKey: LEADER_LOCK_KEY,
      config: options.config?.values,
      leaderTimeouts: options.leaderTimeouts,
      onPersistentFailure: options.onPersistentFailure,
      onConnect: async ({ clientToWorker, workerToClient }) => {
        const config = options.config ?? new Config();
        const origin = typeof location !== 'undefined' ? location.origin : 'unknown';

        // Serve the tab's WebRTC BridgeService (RtcTransportService) to the worker over the
        // worker→client port. Imported lazily so the RTC stack is only pulled in when a worker
        // connection opens.
        const { RtcTransportService, createIceProvider } = await import('@dxos/network-manager');
        const iceProviders = config.get('runtime.services.iceProviders');
        const transportService = new RtcTransportService(
          { iceServers: [...(config.get('runtime.services.ice') ?? [])] },
          iceProviders ? createIceProvider(iceProviders) : undefined,
        );
        this.#bridgeServer = serveBridgeService(workerToClient, transportService);
        await this.#bridgeServer.open();

        // Client services (+ WorkerService control channel) over the client→worker port.
        this.#services = new ClientServicesProxy(clientToWorker);
        await this.#services.open();

        // Hold a tab-liveness lock and hand its key to the worker via WorkerService.start so the
        // worker tears down this session when the tab goes away.
        const lockKey = `${origin}-${crypto.randomUUID()}`;
        const release = new Trigger();
        this.#releaseTabLock = () => release.wake();
        if (typeof navigator !== 'undefined' && typeof navigator.locks !== 'undefined') {
          const acquired = new Trigger();
          void navigator.locks.request(lockKey, async () => {
            acquired.wake();
            await release.wait();
          });
          await acquired.wait();
        }
        await EffectEx.runPromise(this.#services.rpc['WorkerService.start']({ origin, lockKey }));

        return {
          close: async () => {
            this.#releaseTabLock?.();
            this.#releaseTabLock = undefined;
            await this.#services?.close();
            await this.#bridgeServer?.close();
            this.#services = undefined;
            this.#bridgeServer = undefined;
          },
        };
      },
    });
  }

  get closed() {
    return this.#connection.closed;
  }

  get reconnected() {
    return this.#connection.reconnected;
  }

  onReconnect = (callback: () => Promise<void>) => {
    this.#connection.onReconnect(callback);
  };

  get rpc() {
    invariant(this.#services, 'services not initialized');
    return this.#services.rpc;
  }

  get services(): Partial<ClientServices> {
    invariant(this.#services, 'services not initialized');
    return this.#services.services;
  }

  override async _open(): Promise<void> {
    await this.#connection.open();
  }

  override async _close(): Promise<void> {
    await this.#connection.close();
  }
}
