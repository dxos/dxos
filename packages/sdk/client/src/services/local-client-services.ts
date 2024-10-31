//
// Copyright 2023 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  clientServiceBundle,
  ClientServicesProviderResource,
} from '@dxos/client-protocol';
import { type ClientServicesHost, type ClientServicesHostParams } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type SignalManager } from '@dxos/messaging';
import { createIceProvider, type SwarmNetworkManagerOptions, type TransportFactory } from '@dxos/network-manager';
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
  const networking = await setupNetworking(config, {}, () =>
    signalTelemetryEnabled
      ? {
          ...services.signalMetadataTags,
          ...(observabilityGroup ? { group: observabilityGroup } : {}),
        }
      : {},
  );

  const services = new LocalClientServices({ config, ...networking, ...params });
  return services;
};

/**
 * Creates signal manager and transport factory based on config.
 * These are used to create a WebRTC network manager connected to the specified signal server.
 */
const setupNetworking = async (
  config: Config,
  options: Partial<SwarmNetworkManagerOptions> = {},
  signalMetadata?: () => void,
): Promise<{
  signalManager?: SignalManager;
  transportFactory: TransportFactory;
}> => {
  const { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } = await import('@dxos/messaging');
  const { createRtcTransportFactory, MemoryTransportFactory } = await import('@dxos/network-manager');

  const signals = config.get('runtime.services.signaling');
  const edgeFeatures = config.get('runtime.client.edgeFeatures');
  if (signals || edgeFeatures?.signaling) {
    const {
      signalManager = edgeFeatures?.signaling || !signals
        ? undefined // EdgeSignalManager needs EdgeConnection and will be created in service-host
        : new WebsocketSignalManager(signals, signalMetadata),
      transportFactory = createRtcTransportFactory(
        { iceServers: config.get('runtime.services.ice') },
        config.get('runtime.services.iceProviders') && createIceProvider(config.get('runtime.services.iceProviders')!),
      ),
    } = options;

    return {
      signalManager,
      transportFactory,
    };
  }

  // TODO(burdon): Should not provide a memory signal manager since no shared context.
  //  Use TestClientBuilder for shared memory tests.
  log('P2P network is not configured.');
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
    if (typeof window === 'undefined' || typeof window.location === 'undefined') {
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
    const { setIdentityTags } = await import('@dxos/messaging');

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
