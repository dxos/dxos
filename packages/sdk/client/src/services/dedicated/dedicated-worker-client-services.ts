//
// Copyright 2026 DXOS.org
//

import * as Runtime from 'effect/Runtime';

import { Trigger } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, Rpc, serveBridgeService } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type CallMetadata, type LogFilter, log, parseFilter } from '@dxos/log';
import { createIceProvider } from '@dxos/network-manager';
import { subscribeStream } from '@dxos/protocols';
import { type LogEntry, LogLevel } from '@dxos/protocols/proto/dxos/client/services';
import type { MaybePromise } from '@dxos/util';
import { WorkerProtocol } from '@dxos/worker-framework';
import * as Client from '@dxos/worker-framework/Client';

import { ClientServicesProxy } from '../service-proxy';

export const LEADER_LOCK_KEY = '@dxos/client/DedicatedWorkerClientServices/LeaderLock';

export type LeaderTimeoutOptions = Client.LeaderTimeouts;

export interface DedicatedWorkerClientServicesOptions {
  createWorker: () => WorkerProtocol.WorkerOrPort;
  createCoordinator: () => MaybePromise<WorkerProtocol.WorkerCoordinator>;
  config?: Config;
  leaderTimeouts?: LeaderTimeoutOptions;
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
  #loggingStreamCleanup?: () => void;
  readonly #logFilter: LogFilter[];

  constructor(options: DedicatedWorkerClientServicesOptions) {
    super();
    this.#logFilter = parseFilter('error,warn');
    this.#connection = new Client.Connection({
      createWorker: options.createWorker,
      createCoordinator: options.createCoordinator,
      leaderLockKey: LEADER_LOCK_KEY,
      config: options.config?.values,
      leaderTimeouts: options.leaderTimeouts,
      onConnect: async ({ clientToWorker, workerToClient }) => {
        // Temporary port instrumentation (worker-framework undefined-MessagePort crash): the tab-side
        // consumer that feeds `layerMessagePort`; an undefined port here is the direct crash cause.
        log.warn('[port-trace] onConnect', {
          clientToWorker: describePort(clientToWorker),
          workerToClient: describePort(workerToClient),
        });
        const config = options.config ?? new Config();
        const origin = typeof location !== 'undefined' ? location.origin : 'unknown';

        // Serve the tab's WebRTC BridgeService (RtcTransportService) to the worker over the
        // worker→client port. Imported lazily so the RTC stack is only pulled in when a worker
        // connection opens.
        const { RtcTransportService } = await import('@dxos/network-manager');
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
        await EffectEx.runPromise(this.#services.rpc.WorkerService.start({ origin, lockKey }));

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

// Temporary port instrumentation helper (worker-framework undefined-MessagePort crash).
const describePort = (port: unknown): { present: boolean; type: string } => ({
  present: port != null,
  type: Object.prototype.toString.call(port),
});

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
