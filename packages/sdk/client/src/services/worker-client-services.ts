//
// Copyright 2023 DXOS.org
//

import { Event, Trigger, synchronized } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import type { Stream } from '@dxos/codec-protobuf/stream';
import { Config } from '@dxos/config';
import type { PublicKey } from '@dxos/keys';
import { type CallMetadata, type LogFilter, log, parseFilter } from '@dxos/log';
import { type LogEntry, LogLevel } from '@dxos/protocols/proto/dxos/client/services';
import { type ServiceBundle } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { trace } from '@dxos/tracing';

import { RPC_TIMEOUT } from '../common';
import { LOCK_KEY } from '../lock-key';

import { ClientServicesProxy } from './service-proxy';
import { SharedWorkerConnection } from './shared-worker-connection';

/**
 * Creates services provider connected via worker.
 */
export const fromWorker = async (config: Config = new Config(), options: Omit<WorkerClientServicesParams, 'config'>) =>
  new WorkerClientServices({ config, ...options });

export type WorkerClientServicesParams = {
  config: Config;
  createWorker: () => SharedWorker;
  logFilter?: string;
  observabilityGroup?: string;
  signalTelemetryEnabled?: boolean;
};

/**
 * Proxy to host client service in worker.
 */
@trace.resource()
export class WorkerClientServices implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  readonly joinedSpace = new Event<PublicKey>();

  @trace.info()
  private _isOpen = false;

  private readonly _config: Config;
  private readonly _createWorker: () => SharedWorker;
  private readonly _logFilter: LogFilter[];

  private _runtime!: SharedWorkerConnection;
  private _services!: ClientServicesProxy;
  private _loggingStream?: Stream<LogEntry>;
  private readonly _observabilityGroup?: string;
  private readonly _signalTelemetryEnabled: boolean;

  constructor({
    config,
    createWorker,
    logFilter = 'error,warn',
    observabilityGroup,
    signalTelemetryEnabled,
  }: WorkerClientServicesParams) {
    this._config = config;
    this._createWorker = createWorker;
    this._logFilter = parseFilter(logFilter);
    this._observabilityGroup = observabilityGroup;
    this._signalTelemetryEnabled = signalTelemetryEnabled ?? false;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get services(): Partial<ClientServices> {
    return this._services.services;
  }

  get runtime(): SharedWorkerConnection {
    return this._runtime;
  }

  @synchronized
  async open(): Promise<void> {
    if (this._isOpen) {
      return;
    }

    log('opening...');
    const ports = new Trigger<{ systemPort: MessagePort; appPort: MessagePort }>();
    const worker = this._createWorker();
    worker.port.postMessage({ dxlog: localStorage.getItem('dxlog') });
    worker.port.onmessage = (event) => {
      const { command, payload } = event.data;
      if (command === 'init') {
        ports.wake(payload);
      }
    };
    const { systemPort, appPort } = await ports.wait();

    this._runtime = new SharedWorkerConnection({
      config: this._config,
      systemPort: createWorkerPort({ port: systemPort }),
    });
    await this._runtime.open({
      origin: location.origin,
      observabilityGroup: this._observabilityGroup,
      signalTelemetryEnabled: this._signalTelemetryEnabled,
    });

    this._services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
    await this._services.open();
    void navigator.locks.request(LOCK_KEY, () => {
      log('terminated');
      if (this._isOpen) {
        this.closed.emit(new Error('Shared worker terminated.'));
      }
    });

    this._loggingStream = this._services.services.LoggingService.queryLogs(
      {
        filters: this._logFilter,
      },
      { timeout: RPC_TIMEOUT },
    );
    this._loggingStream.subscribe((entry) => {
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
    });

    log('opened');
    this._isOpen = true;
  }

  @synchronized
  async close(): Promise<void> {
    if (!this._isOpen) {
      return;
    }

    log('closing...');
    await this._loggingStream?.close();
    await this._runtime.close();
    await this._services.close();

    log('closed');
    this._isOpen = false;
  }
}

const mapLogMeta = (meta: LogEntry.Meta | undefined): CallMetadata | undefined =>
  meta && {
    F: meta.file,
    L: meta.line,
    S: {
      ...meta.scope,
      remoteSessionId: meta.scope?.hostSessionId,
      hostSessionId: undefined,
    },
  };
