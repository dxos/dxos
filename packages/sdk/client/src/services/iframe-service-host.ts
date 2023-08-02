//
// Copyright 2023 DXOS.org
//

import { Event, Trigger, asyncTimeout } from '@dxos/async';
import {
  ClientServices,
  ClientServicesProvider,
  DEFAULT_CLIENT_ORIGIN,
  DEFAULT_INTERNAL_CHANNEL,
  PROXY_CONNECTION_TIMEOUT,
} from '@dxos/client-protocol';
import { RemoteServiceConnectionTimeout } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { AppContextRequest, LayoutRequest, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { ServiceBundle, createBundledRpcServer } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { Provider } from '@dxos/util';

import { IFrameController } from './iframe-controller';
import { ShellController } from './shell-controller';

export type IFrameClientServicesHostOptions = {
  host: ClientServicesProvider;
  source?: string;
  channel?: string;
  vault?: string;
  timeout?: number;
};

export class IFrameClientServicesHost implements ClientServicesProvider {
  public readonly joinedSpace = new Event<PublicKey>();
  private _iframeController!: IFrameController;
  private _shellController!: ShellController;
  private readonly _host: ClientServicesProvider;
  private readonly _source: string;
  private readonly _vault: string;
  private readonly _timeout: number;

  constructor({
    host,
    source = DEFAULT_CLIENT_ORIGIN,
    vault = DEFAULT_INTERNAL_CHANNEL,
    timeout = PROXY_CONNECTION_TIMEOUT,
  }: IFrameClientServicesHostOptions) {
    this._host = host;
    this._source = source;
    this._vault = vault;
    this._timeout = timeout;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return this._host.descriptors;
  }

  get services(): Partial<ClientServices> {
    return this._host.services;
  }

  get display(): ShellDisplay {
    return this._shellController.display;
  }

  get contextUpdate(): Event<AppContextRequest> {
    return this._shellController.contextUpdate;
  }

  setSpaceProvider(provider: Provider<PublicKey | undefined>) {
    this._shellController.setSpaceProvider(provider);
  }

  async setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    await this._shellController?.setLayout(layout, options);
  }

  async open() {
    await this._host.open();

    // NOTE: Using query params invalidates the service worker cache & requires a custom worker.
    //   https://developer.chrome.com/docs/workbox/modules/workbox-build/#generatesw
    const source = new URL(this._source, window.location.origin);
    const loaded = new Trigger();
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

          this._iframeController.iframe?.contentWindow?.postMessage(
            {
              channel: this._vault,
              payload: {
                command: 'port',
                port: messageChannel.port2,
              },
            },
            this._iframeController.source.origin,
            [messageChannel.port2],
          );

          void server.open();
        }
      },
    });
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
    await this._shellController.close();
    await this._iframeController.close();
    await this._host.close();
  }
}
