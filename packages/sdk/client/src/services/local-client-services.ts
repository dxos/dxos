//
// Copyright 2023 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import type { ClientServicesHost, ClientServicesHostParams } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import type { NetworkManagerOptions } from '@dxos/network-manager';
import { type ServiceBundle } from '@dxos/rpc';

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

/**
 * Starts a local instance of the service host.
 */
export class LocalClientServices implements ClientServicesProvider {
  readonly terminated = new Event<void>();
  private readonly _ctx = new Context();
  private readonly _params: ClientServicesHostParams;
  private _host?: ClientServicesHost;
  private _isOpen = false;

  constructor(params: ClientServicesHostParams) {
    this._params = params;
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
    this._host = new ClientServicesHost({
      ...this._params,
      callbacks: {
        ...this._params.callbacks,
        onReset: async () => {
          this.terminated.emit();
          await this._params.callbacks?.onReset?.();
        },
      },
    });
    await this._host.open(this._ctx);
    this._isOpen = true;
  }

  @synchronized
  async close(): Promise<void> {
    if (!this._isOpen) {
      return;
    }

    await this._host?.close();
    this._isOpen = false;
  }
}
