//
// Copyright 2026 DXOS.org
//

import { type ClientServices, type ClientServicesProvider, Rpc, serveRtcService } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
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
  #rtcServer: Rpc.GroupServer | undefined;

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

        // Serve the tab's WebRTC RTCService to the worker over the worker→client port. Imported
        // lazily so the RTC stack is only pulled in when a worker connection opens.
        const { RtcService, createIceProvider } = await import('@dxos/network-manager');
        const iceProviders = config.get('runtime.services.iceProviders');
        const rtcService = new RtcService(
          { iceServers: [...(config.get('runtime.services.ice') ?? [])] },
          iceProviders ? createIceProvider(iceProviders) : undefined,
        );
        this.#rtcServer = serveRtcService(workerToClient, rtcService);
        await this.#rtcServer.open();

        // Client services over the client→worker port. The framework's session lock tells the worker
        // when this tab goes away.
        this.#services = new ClientServicesProxy(clientToWorker);
        await this.#services.open();

        return {
          close: async () => {
            await this.#services?.close();
            await this.#rtcServer?.close();
            this.#services = undefined;
            this.#rtcServer = undefined;
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
