//
// Copyright 2023 DXOS.org
//

import { Trigger, Event, asyncTimeout } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  DEFAULT_VAULT_URL,
  DEFAULT_INTERNAL_CHANNEL,
  PROXY_CONNECTION_TIMEOUT,
} from '@dxos/client-protocol';
import { RemoteServiceConnectionTimeout } from '@dxos/protocols';
import { type ServiceBundle, createBundledRpcServer } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { trace } from '@dxos/tracing';

import { IFrameManager } from './iframe-manager';
import { ShellManager } from './shell-manager';

export type IFrameClientServicesHostOptions = {
  host: ClientServicesProvider;
  source?: string;
  channel?: string;
  vault?: string;
  timeout?: number;
};

/**
 * Proxy to host client service via iframe.
 *
 * @deprecated
 */
@trace.resource()
export class IFrameClientServicesHost implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  /**
   * @internal
   */
  readonly _shellManager: ShellManager;
  private readonly _iframeManager: IFrameManager;
  private readonly _host: ClientServicesProvider;
  private readonly _source: string;
  private readonly _vault: string;
  private readonly _timeout: number;

  constructor({
    host,
    source = DEFAULT_VAULT_URL,
    vault = DEFAULT_INTERNAL_CHANNEL,
    timeout = PROXY_CONNECTION_TIMEOUT,
  }: IFrameClientServicesHostOptions) {
    this._host = host;
    this._source = source;
    this._vault = vault;
    this._timeout = timeout;

    const loaded = new Trigger();
    this._iframeManager = new IFrameManager({
      // NOTE: Using query params invalidates the service worker cache & requires a custom worker.
      //   https://developer.chrome.com/docs/workbox/modules/workbox-build/#generatesw
      source: new URL(this._source, window.location.origin),
      onOpen: async () => {
        await asyncTimeout(loaded.wait(), this._timeout, new RemoteServiceConnectionTimeout('Vault failed to load'));

        this._iframeManager?.iframe?.contentWindow?.postMessage(
          {
            channel: this._vault,
            payload: 'init',
          },
          this._iframeManager.source.origin,
        );
      },
      onMessage: (event) => {
        const { channel, payload } = event.data;
        if (channel !== this._vault) {
          return;
        }
        if (payload === 'loaded') {
          loaded.wake();
        } else if (payload === 'client') {
          const messageChannel = new MessageChannel();
          const server = createBundledRpcServer({
            services: this._host.descriptors,
            handlers: this._host.services,
            port: createWorkerPort({ port: messageChannel.port1 }),
          });

          this._iframeManager?.iframe?.contentWindow?.postMessage(
            {
              channel: this._vault,
              payload: {
                command: 'port',
                port: messageChannel.port2,
              },
            },
            this._iframeManager.source.origin,
            [messageChannel.port2],
          );

          void server.open();
        }
      },
    });

    this._shellManager = new ShellManager(this._iframeManager);
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return this._host.descriptors;
  }

  get services(): Partial<ClientServices> {
    return this._host.services;
  }

  async open() {
    await this._host.open();
    await this._shellManager.open();
  }

  async close() {
    await this._shellManager.close();
    await this._iframeManager.close();
    await this._host.close();
  }
}
