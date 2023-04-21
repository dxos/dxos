//
// Copyright 2021 DXOS.org
//

import { asyncTimeout, Event, Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { RemoteServiceConnectionError, RemoteServiceConnectionTimeout } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log, parseFilter } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { LogEntry, LogLevel } from '@dxos/protocols/proto/dxos/client/services';
import { LayoutRequest, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { RpcPort } from '@dxos/rpc';
import { createIFrame, createIFramePort } from '@dxos/rpc-tunnel';
import { Provider } from '@dxos/util';

import { ShellController } from '../proxies';
import {
  DEFAULT_CLIENT_CHANNEL,
  DEFAULT_CLIENT_ORIGIN,
  DEFAULT_INTERNAL_CHANNEL,
  DEFAULT_SHELL_CHANNEL
} from './config';
import { ClientServicesProvider } from './service-definitions';
import { ClientServicesProxy } from './service-proxy';

const shellStyles = Object.entries({
  display: 'none',
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  border: 0,
  'z-index': 60
}).reduce((acc, [key, value]) => `${acc}${key}: ${value};`, '');

export type IFrameClientServicesProxyOptions = {
  source: string;
  channel: string;
  shell: boolean | string;
  vault: string;
  logFilter: string;
  timeout: number;
};

/**
 * Proxy to host client service via iframe.
 */
export class IFrameClientServicesProxy implements ClientServicesProvider {
  public readonly joinedSpace = new Event<PublicKey>();

  private readonly _options: IFrameClientServicesProxyOptions;
  private _iframe?: HTMLIFrameElement;
  private _clientServicesProxy?: ClientServicesProxy;
  private _loggingStream?: Stream<LogEntry>;
  private _shellController?: ShellController;
  private _spaceProvider?: Provider<PublicKey | undefined>;

  /**
   * Unique id.
   */
  private readonly _instanceId = PublicKey.random().toHex();

  constructor({
    source = DEFAULT_CLIENT_ORIGIN,
    channel = DEFAULT_CLIENT_CHANNEL,
    shell = DEFAULT_SHELL_CHANNEL,
    vault = DEFAULT_INTERNAL_CHANNEL,
    logFilter = 'error,warn',
    timeout = 1000
  }: Partial<IFrameClientServicesProxyOptions> = {}) {
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._options = { source, channel, shell, vault, logFilter, timeout };
  }

  get proxy() {
    return this._clientServicesProxy!.proxy;
  }

  get descriptors() {
    return this._clientServicesProxy!.descriptors;
  }

  get services() {
    return this._clientServicesProxy!.services;
  }

  get display() {
    return this._shellController?.display;
  }

  get contextUpdate() {
    return this._shellController?.contextUpdate;
  }

  setSpaceProvider(provider: Provider<PublicKey | undefined>) {
    this._spaceProvider = provider;
  }

  async setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    await this._shellController?.setLayout(layout, options);
  }

  async open() {
    log.trace('dxos.sdk.iframe-client-services-proxy', trace.begin({ id: this._instanceId }));

    if (!this._clientServicesProxy) {
      this._clientServicesProxy = new ClientServicesProxy(await this._getIFramePort(this._options.channel));
    }

    if (!this._shellController && typeof this._options.shell === 'string') {
      this._shellController = new ShellController(await this._getIFramePort(this._options.shell));
      this._iframe!.setAttribute('style', shellStyles);
      this._iframe!.setAttribute('data-testid', 'dxos-shell');
      this._shellController.contextUpdate.on(({ display, spaceKey }) => {
        this._iframe!.style.display = display === ShellDisplay.NONE ? 'none' : '';
        if (display === ShellDisplay.NONE) {
          this._iframe!.blur();
        }
        spaceKey && this.joinedSpace.emit(spaceKey);
      });

      window.addEventListener('keydown', this._handleKeyDown);
    }

    await this._clientServicesProxy.open();

    this._loggingStream = this._clientServicesProxy.services.LoggingService.queryLogs({
      filters: parseFilter(this._options.logFilter)
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

    await this._shellController?.open();
    if (!this._shellController) {
      return;
    }

    // TODO(wittjosiah): Allow path/params for invitations to be customizable.
    const searchParams = new URLSearchParams(window.location.search);
    const spaceInvitationCode = searchParams.get('spaceInvitationCode');
    if (spaceInvitationCode) {
      await this._shellController.setLayout(ShellLayout.JOIN_SPACE, { invitationCode: spaceInvitationCode });
      return;
    }

    const haloInvitationCode = searchParams.get('haloInvitationCode');
    if (haloInvitationCode) {
      await this._shellController.setLayout(ShellLayout.INITIALIZE_IDENTITY, {
        invitationCode: haloInvitationCode ?? undefined
      });
    }
  }

  async close() {
    window.removeEventListener('keydown', this._handleKeyDown);
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

  private async _getIFramePort(channel: string): Promise<RpcPort> {
    // NOTE: Using query params invalidates the service worker cache & requires a custom worker.
    //   https://developer.chrome.com/docs/workbox/modules/workbox-build/#generatesw
    const source = new URL(
      typeof this._options.shell === 'string' ? this._options.source : `${this._options.source}#disableshell`,
      window.location.origin
    );

    if (!this._iframe) {
      const res = await fetch(source);
      if (res.status >= 400) {
        throw new RemoteServiceConnectionError(`Failed to fetch ${source}`, { source, status: res.status });
      }

      // NOTE: This is intentiontally not using protobuf because it occurs before the rpc connection is established.
      const trigger = new Trigger();
      const handler = (event: MessageEvent) => {
        const { channel, payload } = event.data;
        if (channel === this._options.vault && payload === 'loaded') {
          trigger.wake();
        }
      };
      window.addEventListener('message', handler);

      const iframeId = `__DXOS_CLIENT_${PublicKey.random().toHex()}__`;
      this._iframe = createIFrame(source.toString(), iframeId, { allow: 'clipboard-read; clipboard-write' });

      await asyncTimeout(
        trigger.wait(),
        this._options.timeout,
        new RemoteServiceConnectionTimeout('Vault failed to load')
      );
      window.removeEventListener('message', handler);
    }

    return createIFramePort({ origin: source.origin, iframe: this._iframe, channel });
  }

  private async _handleKeyDown(event: KeyboardEvent) {
    if (!this._shellController) {
      return;
    }

    const modifier = event.ctrlKey || event.metaKey;
    if (event.key === '>' && event.shiftKey && modifier) {
      await this._shellController.setLayout(ShellLayout.DEVICE_INVITATIONS);
    } else if (event.key === '.' && modifier) {
      const spaceKey = await this._spaceProvider?.();
      await this._shellController.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey });
    }
  }
}
