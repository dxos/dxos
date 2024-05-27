//
// Copyright 2021 DXOS.org
//

import { asyncTimeout, Event, Trigger } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  DEFAULT_VAULT_URL,
  DEFAULT_INTERNAL_CHANNEL,
  DEFAULT_SHELL_CHANNEL,
  PROXY_CONNECTION_TIMEOUT,
} from '@dxos/client-protocol';
import { type Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log, type LogFilter, parseFilter } from '@dxos/log';
import { RemoteServiceConnectionTimeout, trace as Trace } from '@dxos/protocols';
import { type LogEntry, LogLevel } from '@dxos/protocols/proto/dxos/client/services';
import { type RpcPort, type ServiceBundle } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { trace } from '@dxos/tracing';

import { IFrameManager } from './iframe-manager';
import { ClientServicesProxy } from './service-proxy';
import { ShellManager } from './shell-manager';
import { type Client } from '../client';
import { RPC_TIMEOUT } from '../common';

export type IFrameClientServicesProxyOptions = {
  source?: string;
  client?: Client;
  shell?: boolean | string;
  vault?: string;
  timeout?: number;
  logFilter?: string;
};

/**
 * Proxy to host client service via iframe.
 *
 * @deprecated
 */
@trace.resource()
export class IFrameClientServicesProxy implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  /**
   * @internal
   */
  readonly _shellManager?: ShellManager;
  private readonly _iframeManager: IFrameManager;
  private _appPort!: RpcPort;
  private _clientServicesProxy?: ClientServicesProxy;
  private _loggingStream?: Stream<LogEntry>;
  private readonly _source: string;
  private readonly _shell: string | boolean;
  private readonly _vault: string;
  private readonly _logFilter: LogFilter[];
  private readonly _timeout: number;

  /**
   * Unique id.
   */
  private readonly _instanceId = PublicKey.random().toHex();

  constructor({
    source = DEFAULT_VAULT_URL,
    shell = DEFAULT_SHELL_CHANNEL,
    vault = DEFAULT_INTERNAL_CHANNEL,
    timeout = PROXY_CONNECTION_TIMEOUT,
    logFilter = 'error,warn',
  }: IFrameClientServicesProxyOptions = {}) {
    this._source = source;
    this._shell = shell;
    this._vault = vault;
    this._logFilter = parseFilter(logFilter);
    this._timeout = timeout;

    const loaded = new Trigger();
    const ready = new Trigger<MessagePort>();
    this._iframeManager = new IFrameManager({
      // NOTE: Using query params invalidates the service worker cache & requires a custom worker.
      //   https://developer.chrome.com/docs/workbox/modules/workbox-build/#generatesw
      source: new URL(
        typeof this._shell === 'string' ? this._source : `${this._source}#disableshell`,
        window.location.origin,
      ),
      onOpen: async () => {
        await asyncTimeout(loaded.wait(), this._timeout, new RemoteServiceConnectionTimeout('Vault failed to load'));

        this._iframeManager.iframe?.contentWindow?.postMessage(
          {
            channel: this._vault,
            payload: 'init',
          },
          this._iframeManager.source.origin,
        );

        const port = await asyncTimeout(
          ready.wait(),
          this._timeout,
          new RemoteServiceConnectionTimeout('Vault failed to provide MessagePort'),
        );

        this._appPort = createWorkerPort({ port });
      },
      onMessage: async (event) => {
        const { channel, payload } = event.data;
        if (channel !== this._vault) {
          return;
        }

        if (payload === 'loaded') {
          loaded.wake();
        } else if (payload?.command === 'init') {
          ready.wake(payload.port);
        }
      },
    });

    if (typeof this._shell === 'string') {
      this._shellManager = new ShellManager(this._iframeManager);
    }
  }

  get proxy() {
    return this._clientServicesProxy!.proxy;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return this._clientServicesProxy!.descriptors;
  }

  get services(): Partial<ClientServices> {
    return this._clientServicesProxy!.services;
  }

  async open() {
    if (this._clientServicesProxy) {
      return;
    }

    log.trace('dxos.sdk.iframe-clientTraceices-proxy', Trace.begin({ id: this._instanceId }));

    await this._iframeManager.open();
    this._clientServicesProxy = new ClientServicesProxy(this._appPort);
    await this._clientServicesProxy.open();

    this._loggingStream = this._clientServicesProxy.services.LoggingService.queryLogs(
      {
        filters: this._logFilter,
      },
      { timeout: RPC_TIMEOUT },
    );
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

    await this._shellManager?.open();
  }

  async close() {
    await this._shellManager?.close();
    await this._iframeManager.close();
    await this._loggingStream?.close();
    await this._clientServicesProxy?.close();
    this._clientServicesProxy = undefined;
    log.trace('dxos.sdk.iframe-clientTraceices-proxy', Trace.end({ id: this._instanceId }));
  }
}
