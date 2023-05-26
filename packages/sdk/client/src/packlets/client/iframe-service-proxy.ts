//
// Copyright 2021 DXOS.org
//

import { asyncTimeout, Event, Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { RemoteServiceConnectionTimeout } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log, LogFilter, parseFilter } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { LogEntry, LogLevel } from '@dxos/protocols/proto/dxos/client/services';
import { LayoutRequest, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { RpcPort, ServiceBundle } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { DEFAULT_TIMEOUT } from '@dxos/timeouts';
import { Provider } from '@dxos/util';

import { ShellController } from '../proxies';
import { Client } from './client';
import { DEFAULT_CLIENT_ORIGIN, DEFAULT_INTERNAL_CHANNEL, DEFAULT_SHELL_CHANNEL } from './config';
import { IFrameController } from './iframe-controller';
import { ClientServices, ClientServicesProvider } from './service-definitions';
import { ClientServicesProxy } from './service-proxy';

export type IFrameClientServicesProxyOptions = {
  source?: string;
  client?: Client;
  shell?: boolean | string;
  vault?: string;
  logFilter?: string;
  timeout?: number;
};

/**
 * Proxy to host client service via iframe.
 */
export class IFrameClientServicesProxy implements ClientServicesProvider {
  public readonly joinedSpace = new Event<PublicKey>();

  private _iframe?: HTMLIFrameElement;
  private _appPort!: RpcPort;
  private _shellPort?: RpcPort;
  private _clientServicesProxy?: ClientServicesProxy;
  private _loggingStream?: Stream<LogEntry>;
  private _iframeController!: IFrameController;
  private _shellController?: ShellController;
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
    source = DEFAULT_CLIENT_ORIGIN,
    shell = DEFAULT_SHELL_CHANNEL,
    vault = DEFAULT_INTERNAL_CHANNEL,
    logFilter = 'error,warn',
    timeout = DEFAULT_TIMEOUT,
  }: IFrameClientServicesProxyOptions = {}) {
    this._source = source;
    this._shell = shell;
    this._vault = vault;
    this._logFilter = parseFilter(logFilter);
    this._timeout = timeout;
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

  get display() {
    return this._shellController?.display;
  }

  get contextUpdate() {
    return this._shellController?.contextUpdate;
  }

  setSpaceProvider(provider: Provider<PublicKey | undefined>) {
    this._shellController?.setSpaceProvider(provider);
  }

  async setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    await this._shellController?.setLayout(layout, options);
  }

  async open() {
    if (this._clientServicesProxy) {
      return;
    }

    log.trace('dxos.sdk.iframe-client-services-proxy', trace.begin({ id: this._instanceId }));

    // NOTE: Using query params invalidates the service worker cache & requires a custom worker.
    //   https://developer.chrome.com/docs/workbox/modules/workbox-build/#generatesw
    const source = new URL(
      typeof this._shell === 'string' ? this._source : `${this._source}#disableshell`,
      window.location.origin,
    );
    const loaded = new Trigger();
    const ready = new Trigger<MessagePort>();
    this._iframeController = new IFrameController({
      source,
      onOpen: async () => {
        await asyncTimeout(loaded.wait(), this._timeout, new RemoteServiceConnectionTimeout('Vault failed to load'));

        this._iframeController.iframe?.contentWindow?.postMessage(
          {
            channel: this._vault,
            payload: 'init',
          },
          this._iframeController.source.origin,
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

    await this._iframeController.open();

    this._clientServicesProxy = new ClientServicesProxy(this._appPort);
    await this._clientServicesProxy.open();

    this._loggingStream = this._clientServicesProxy.services.LoggingService.queryLogs({
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

    if (typeof this._shell !== 'string') {
      return;
    }

    this._shellController = new ShellController(this._iframeController, this.joinedSpace);
    await this._shellController.open();

    // TODO(wittjosiah): Allow path/params for invitations to be customizable.
    const searchParams = new URLSearchParams(window.location.search);
    const spaceInvitationCode = searchParams.get('spaceInvitationCode');
    if (spaceInvitationCode) {
      await this._shellController.setLayout(ShellLayout.JOIN_SPACE, { invitationCode: spaceInvitationCode });
      return;
    }

    const deviceInvitationCode = searchParams.get('deviceInvitationCode');
    if (deviceInvitationCode) {
      await this._shellController.setLayout(ShellLayout.INITIALIZE_IDENTITY, {
        invitationCode: deviceInvitationCode ?? undefined,
      });
    }
  }

  async close() {
    await this._shellController?.close();
    await this._loggingStream?.close();
    await this._clientServicesProxy?.close();
    this._shellController = undefined;
    this._clientServicesProxy = undefined;
    if (this._iframe) {
      this._iframe.remove();
      this._iframe = undefined;
    }
    log.trace('dxos.sdk.iframe-client-services-proxy', trace.end({ id: this._instanceId }));
  }
}
