//
// Copyright 2023 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import {
  type ClientServicesHost,
  type ClientServicesHostParams,
  ClientServicesProviderResource,
} from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { setIdentityTags } from '@dxos/messaging';
import { createLibDataChannelTransportFactory, type NetworkManagerOptions } from '@dxos/network-manager';
import { type ServiceBundle } from '@dxos/rpc';
import { trace } from '@dxos/tracing';

/**
 * Creates stand-alone services without rpc.
 */
// TODO(burdon): Rename createLocalServices?
export const fromHost = async (
  config = new Config(),
  params?: ClientServicesHostParams,
  observabilityGroup?: string,
  signalTelemetryEnabled?: boolean,
): Promise<ClientServicesProvider> => {
  const getSignalMetadata = () => {
    return {
      ...services.signalMetadataTags,
      ...(observabilityGroup ? { group: observabilityGroup } : {}),
    };
  };
  const services = new LocalClientServices({
    config,
    ...(await setupNetworking(config, {}, getSignalMetadata)),
    ...params,
  });
  return services;
};

/**
 * Creates signal manager and transport factory based on config.
 * These are used to create a WebRTC network manager connected to the specified signal server.
 */
const setupNetworking = async (
  config: Config,
  options: Partial<NetworkManagerOptions> = {},
  signalMetadata?: () => void,
) => {
  const { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } = await import('@dxos/messaging');
  const { createSimplePeerTransportFactory, MemoryTransportFactory } = await import('@dxos/network-manager');

  const signals = config.get('runtime.services.signaling');
  if (signals) {
    const {
      signalManager = new WebsocketSignalManager(signals, signalMetadata),
      // TODO(nf): configure better
      transportFactory = process.env.MOCHA_ENV === 'nodejs'
        ? createLibDataChannelTransportFactory({ iceServers: config.get('runtime.services.ice') })
        : createSimplePeerTransportFactory({
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
@trace.resource({ annotation: ClientServicesProviderResource })
export class LocalClientServices implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  private readonly _ctx = new Context();
  private readonly _params: ClientServicesHostParams;
  private _host?: ClientServicesHost;
  signalMetadataTags: any = {
    runtime: 'local-client-services',
  };

  @trace.info()
  private _isOpen = false;

  constructor(params: ClientServicesHostParams) {
    this._params = params;
    // TODO(nf): extract
    if (typeof window === 'undefined') {
      // TODO(nf): collect ClientServices metadata as param?
      this.signalMetadataTags.origin = 'undefined';
    } else {
      // SocketSupply native app
      if ((globalThis as any).__args) {
        this.signalMetadataTags.runtime = 'native';
        this.signalMetadataTags.origin = window.location.origin;
        // TODO(nf): access socket app metadata?
      } else {
        this.signalMetadataTags.origin = window.location.origin;
      }
    }
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
          this.closed.emit(undefined);
          await this._params.callbacks?.onReset?.();
        },
      },
    });
    await this._host.open(this._ctx);
    this._isOpen = true;
    setIdentityTags({
      identityService: this._host.services.IdentityService!,
      devicesService: this._host.services.DevicesService!,
      setTag: (k: string, v: string) => {
        this.signalMetadataTags[k] = v;
      },
    });
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
