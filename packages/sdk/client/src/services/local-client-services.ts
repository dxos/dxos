//
// Copyright 2023 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  clientServiceBundle,
  DEFAULT_CLIENT_CHANNEL,
} from '@dxos/client-protocol';
import type { ClientServicesHost, ClientServicesHostParams } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { NetworkManagerOptions } from '@dxos/network-manager';
import { createProtoRpcPeer, type ProtoRpcPeer, type ServiceBundle } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';
import { isNode } from '@dxos/util';

import { IFrameManager } from './iframe-manager';
import { ShellManager } from './shell-manager';

/**
 * Creates stand-alone services without rpc.
 */
// TODO(burdon): Rename createLocalServices?
export const fromHost = async (
  config = new Config(),
  params?: ClientServicesHostParams,
): Promise<ClientServicesProvider> => {
  return new LocalClientServices({
    config,
    ...(await setupNetworking(config)),
    ...params,
  });
};

/**
 * Creates signal manager and transport factory based on config.
 * These are used to create a WebRTC network manager connected to the specified signal server.
 */
const setupNetworking = async (config: Config, options: Partial<NetworkManagerOptions> = {}) => {
  const { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } = await import('@dxos/messaging');
  const { createSimplePeerTransportFactory, MemoryTransportFactory } = await import('@dxos/network-manager');

  const signals = config.get('runtime.services.signaling');
  if (signals) {
    const {
      signalManager = new WebsocketSignalManager(signals),
      transportFactory = createSimplePeerTransportFactory({
        iceServers: config.get('runtime.services.ice'),
      }),
    } = options;

    return {
      signalManager,
      transportFactory,
    };
  }

  // TODO(burdon): Should not provide a memory signal manager since no shared context.
  //  Use TestClientBuilder for shared memory tests.
  log.warn('P2P network is not configured.');
  const signalManager = new MemorySignalManager(new MemorySignalManagerContext());
  const transportFactory = MemoryTransportFactory;
  return {
    signalManager,
    transportFactory,
  };
};

export type LocalClientServicesParams = ClientServicesHostParams & {
  shell?: string | null;
};

/**
 * Starts a local instance of the service host.
 */
export class LocalClientServices implements ClientServicesProvider {
  readonly joinedSpace = new Event<PublicKey>();

  private readonly _params: ClientServicesHostParams;
  private _host?: ClientServicesHost;
  private _proxy?: ProtoRpcPeer<ClientServices>;

  private _isOpen = false;
  private _iframeManager?: IFrameManager;
  /**
   * @internal
   */
  _shellManager?: ShellManager;

  constructor({ shell = '/shell.html', ...params }: LocalClientServicesParams) {
    this._params = params;
    this._iframeManager =
      shell && !isNode() ? new IFrameManager({ source: new URL(shell, window.location.origin) }) : undefined;
    this._shellManager = this._iframeManager ? new ShellManager(this._iframeManager, this.joinedSpace) : undefined;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get services(): Partial<ClientServices> {
    return this._host?.services ?? {};
  }

  get host(): ClientServicesHost | undefined {
    return this._host;
  }

  @synchronized
  async open(): Promise<void> {
    if (this._isOpen) {
      return;
    }

    const { ClientServicesHost } = await import('@dxos/client-services');
    this._host = new ClientServicesHost(this._params);

    // TODO(wittjosiah): Factor out iframe manager and proxy into shell manager.
    await this._iframeManager?.open();
    await this._shellManager?.open();
    await this._host.open(new Context());

    if (this._iframeManager?.iframe) {
      this._proxy = createProtoRpcPeer({
        exposed: clientServiceBundle,
        handlers: this._host.services as ClientServices,
        port: createIFramePort({
          channel: DEFAULT_CLIENT_CHANNEL,
          iframe: this._iframeManager.iframe,
          origin: this._iframeManager.source.origin,
        }),
      });
      await this._proxy.open();
    }

    this._isOpen = true;
  }

  @synchronized
  async close(): Promise<void> {
    if (!this._isOpen) {
      return;
    }

    await this._proxy?.close();
    await this._host?.close();
    await this._shellManager?.close();
    await this._iframeManager?.close();

    this._isOpen = false;
  }
}
