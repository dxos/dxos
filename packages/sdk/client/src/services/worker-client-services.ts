//
// Copyright 2023 DXOS.org
//

import { Event, Trigger, synchronized } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import type { SharedWorkerConnection } from '@dxos/client-services';
import type { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import type { PublicKey } from '@dxos/keys';
import { type LogFilter, parseFilter, log } from '@dxos/log';
import { type LogEntry, LogLevel } from '@dxos/protocols/proto/dxos/client/services';
import { type ServiceBundle } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { ClientServicesProxy } from './service-proxy';
import { LOCK_KEY } from '../lock-key';

/**
 * Creates services provider connected via worker.
 */
export const fromWorker = async (config: Config = new Config(), options: Omit<WorkerClientServicesParams, 'config'>) =>
  new WorkerClientServices({ config, ...options });

export type WorkerClientServicesParams = {
  config: Config;
  createWorker: () => SharedWorker;
  logFilter?: string;
};

/**
 * Proxy to host client service in worker.
 */
export class WorkerClientServices implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  readonly joinedSpace = new Event<PublicKey>();

  private _isOpen = false;
  private readonly _config: Config;
  private readonly _createWorker: () => SharedWorker;
  private readonly _logFilter: LogFilter[];

  private _runtime!: SharedWorkerConnection;
  private _services!: ClientServicesProxy;
  private _loggingStream?: Stream<LogEntry>;

  constructor({ config, createWorker, logFilter = 'error,warn' }: WorkerClientServicesParams) {
    this._config = config;
    this._createWorker = createWorker;
    this._logFilter = parseFilter(logFilter);
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
    const { SharedWorkerConnection } = await import('@dxos/client-services');

    const ports = new Trigger<{ systemPort: MessagePort; appPort: MessagePort }>();
    const worker = this._createWorker();
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
    await this._runtime.open(location.origin);

    this._services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
    await this._services.open();
    void navigator.locks.request(LOCK_KEY, () => {
      log('terminated');
      if (this._isOpen) {
        this.closed.emit(new Error('Shared worker terminated.'));
      }
    });

    this._loggingStream = this._services.services.LoggingService.queryLogs({
      filters: this._logFilter,
    });
    this._loggingStream.subscribe((entry) => {
      switch (entry.level) {
        case LogLevel.DEBUG:
          log.debug(`[worker] ${entry.message}`, entry.context);
          break;
        case LogLevel.INFO:
          log.info(`[worker] ${entry.message}`, entry.context);
          break;
        case LogLevel.WARN:
          log.warn(`[worker] ${entry.message}`, entry.context);
          break;
        case LogLevel.ERROR:
          log.error(`[worker] ${entry.message}`, entry.context);
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
