//
// Copyright 2026 DXOS.org
//

import * as Runtime from 'effect/Runtime';

import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type CallMetadata, type LogFilter, log, parseFilter } from '@dxos/log';
import { subscribeStream } from '@dxos/protocols';
import { type LogEntry, LogLevel } from '@dxos/protocols/proto/dxos/client/services';
import { type ServiceBundle } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import type { MaybePromise } from '@dxos/util';
import {
  type LeaderTimeoutOptions,
  WorkerConnection,
  type WorkerCoordinator,
  type WorkerOrPort,
} from '@dxos/worker-framework';

import { ClientServicesProxy } from '../service-proxy';
import { SharedWorkerConnection } from '../shared-worker-connection';

export const LEADER_LOCK_KEY = '@dxos/client/DedicatedWorkerClientServices/LeaderLock';

export type { LeaderTimeoutOptions };

export interface DedeciatedWorkerClientServicesOptions {
  createWorker: () => WorkerOrPort;
  createCoordinator: () => MaybePromise<WorkerCoordinator>;
  config?: Config;
  leaderTimeouts?: LeaderTimeoutOptions;
}

/**
 * Runs services in a dedicated worker, exposed to other tabs.
 * Leader election is used to ensure only a single worker is running.
 */
export class DedicatedWorkerClientServices extends Resource implements ClientServicesProvider {
  readonly #connection: WorkerConnection;
  #services: ClientServicesProxy | undefined;
  #systemConnection: SharedWorkerConnection | undefined;
  #loggingStreamCleanup?: () => void;
  readonly #logFilter: LogFilter[];

  constructor(options: DedeciatedWorkerClientServicesOptions) {
    super();
    this.#logFilter = parseFilter('error,warn');
    this.#connection = new WorkerConnection({
      createWorker: options.createWorker,
      createCoordinator: options.createCoordinator,
      leaderLockKey: LEADER_LOCK_KEY,
      config: options.config?.values,
      leaderTimeouts: options.leaderTimeouts,
      onConnect: async ({ appPort, systemPort }) => {
        const config = options.config ?? new Config();
        this.#systemConnection = new SharedWorkerConnection({
          config,
          systemPort: createWorkerPort({ port: systemPort }),
        });
        await this.#systemConnection.open({
          origin: typeof location !== 'undefined' ? location.origin : 'unknown',
        });

        this.#services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
        await this.#services.open();

        this.#loggingStreamCleanup?.();
        this.#loggingStreamCleanup = subscribeStream(
          Runtime.defaultRuntime,
          this.#services.rpc.LoggingService.queryLogs({ filters: this.#logFilter }),
          {
            onData: (entry) => {
              switch (entry.level) {
                case LogLevel.DEBUG:
                  log.debug(entry.message, entry.context, mapLogMeta(entry.meta));
                  break;
                case LogLevel.VERBOSE:
                  log.verbose(entry.message, entry.context, mapLogMeta(entry.meta));
                  break;
                case LogLevel.INFO:
                  log.info(entry.message, entry.context, mapLogMeta(entry.meta));
                  break;
                case LogLevel.WARN:
                  log.warn(entry.message, entry.context, mapLogMeta(entry.meta));
                  break;
                case LogLevel.ERROR:
                  log.error(entry.message, entry.context, mapLogMeta(entry.meta));
                  break;
              }
            },
            onError: (err) => log.catch(err),
          },
        );

        return {
          close: async () => {
            this.#loggingStreamCleanup?.();
            this.#loggingStreamCleanup = undefined;
            await this.#services?.close();
            await this.#systemConnection?.close();
            this.#services = undefined;
            this.#systemConnection = undefined;
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

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

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

const mapLogMeta = (meta: LogEntry.Meta | undefined): CallMetadata | undefined => {
  return (
    meta && {
      F: meta.file,
      L: meta.line,
      S: {
        ...meta.scope,
        remoteSessionId: meta.scope?.hostSessionId,
        hostSessionId: undefined,
      },
    }
  );
};
