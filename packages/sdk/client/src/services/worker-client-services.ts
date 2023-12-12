//
// Copyright 2023 DXOS.org
//

import { Event, Trigger, synchronized } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  clientServiceBundle,
  DEFAULT_CLIENT_CHANNEL,
} from '@dxos/client-protocol';
import type { WorkerProxyRuntime } from '@dxos/client-services';
import type { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import type { PublicKey } from '@dxos/keys';
import { type LogFilter, parseFilter, log } from '@dxos/log';
import { type LogEntry, LogLevel } from '@dxos/protocols/proto/dxos/client/services';
import { createProtoRpcPeer, type ProtoRpcPeer, type ServiceBundle } from '@dxos/rpc';
import { createIFramePort, createWorkerPort } from '@dxos/rpc-tunnel';

import { IFrameManager } from './iframe-manager';
import { ClientServicesProxy } from './service-proxy';
import { ShellManager } from './shell-manager';

/**
 * Creates services provider connected via worker.
 */
export const fromWorker = async (
  config: Config = new Config(),
  options: Omit<WorkerClientServicesParams, 'config' | 'createWorker'> = {},
) => {
  return new WorkerClientServices({
    config,
    createWorker: () =>
      new SharedWorker(new URL('./shared-worker', import.meta.url), {
        type: 'module',
        name: 'dxos-client-worker',
      }),
    ...options,
  });
};

export type WorkerClientServicesParams = {
  config: Config;
  createWorker: () => SharedWorker;
  shell?: string | null;
  logFilter?: string;
};

/**
 * Proxy to host client service in worker.
 */
export class WorkerClientServices implements ClientServicesProvider {
  readonly joinedSpace = new Event<PublicKey>();

  private _isOpen = false;
  private readonly _config: Config;
  private readonly _createWorker: () => SharedWorker;
  private readonly _logFilter: LogFilter[];

  private _runtime!: WorkerProxyRuntime;
  private _services!: ClientServicesProxy;
  private _proxy?: ProtoRpcPeer<ClientServices>;
  private _loggingStream?: Stream<LogEntry>;
  private _iframeManager?: IFrameManager;
  /**
   * @internal
   */
  _shellManager?: ShellManager;

  constructor({ config, createWorker, shell = '/shell.html', logFilter = 'error,warn' }: WorkerClientServicesParams) {
    this._config = config;
    this._createWorker = createWorker;
    this._logFilter = parseFilter(logFilter);
    this._iframeManager = shell ? new IFrameManager({ source: new URL(shell, window.location.origin) }) : undefined;
    this._shellManager = this._iframeManager ? new ShellManager(this._iframeManager, this.joinedSpace) : undefined;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get services(): Partial<ClientServices> {
    return this._services.services;
  }

  get runtime(): WorkerProxyRuntime {
    return this._runtime;
  }

  @synchronized
  async open(): Promise<void> {
    if (this._isOpen) {
      return;
    }

    const { WorkerProxyRuntime } = await import('@dxos/client-services');

    await this._iframeManager?.open();
    await this._shellManager?.open();

    const ports = new Trigger<{ systemPort: MessagePort; appPort: MessagePort }>();
    const worker = this._createWorker();
    worker.port.onmessage = (event) => {
      const { command, payload } = event.data;
      if (command === 'init') {
        ports.wake(payload);
      }
    };
    const { systemPort, appPort } = await ports.wait();

    this._runtime = new WorkerProxyRuntime({
      config: this._config,
      systemPort: createWorkerPort({ port: systemPort }),
    });
    await this._runtime.open(location.origin);

    this._services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
    await this._services.open();

    if (this._iframeManager?.iframe) {
      this._proxy = createProtoRpcPeer({
        exposed: clientServiceBundle,
        handlers: this._services.services as ClientServices,
        port: createIFramePort({
          channel: DEFAULT_CLIENT_CHANNEL,
          iframe: this._iframeManager.iframe,
          origin: this._iframeManager.source.origin,
        }),
      });
      await this._proxy.open();
    }

    this._loggingStream = this._services.services.LoggingService.queryLogs({
      filters: this._logFilter,
    });
    this._loggingStream.subscribe((entry) => {
      switch (entry.level) {
        case LogLevel.DEBUG:
          log.debug(`[vault] ${entry.message}`, entry.context);
          break;
        case LogLevel.INFO:
          log.info(`[vault] ${entry.message}`, entry.context);
          break;
        case LogLevel.WARN:
          log.warn(`[vault] ${entry.message}`, entry.context);
          break;
        case LogLevel.ERROR:
          log.error(`[vault] ${entry.message}`, entry.context);
          break;
      }
    });

    this._isOpen = true;
  }

  @synchronized
  async close(): Promise<void> {
    if (!this._isOpen) {
      return;
    }

    await this._loggingStream?.close();
    await this._proxy?.close();
    await this._services.close();
    await this._runtime.close();
    await this._shellManager?.close();
    await this._iframeManager?.close();

    this._isOpen = false;
  }
}
