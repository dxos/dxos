//
// Copyright 2022 DXOS.org
//

import { ClientServicesHost, ClientServicesProvider } from '@dxos/client-services';
import { Config, ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import {
  createWebRTCTransportFactory,
  MemoryTransportFactory,
  NetworkManager,
  NetworkManagerOptions
} from '@dxos/network-manager';

import { DEFAULT_CONFIG_CHANNEL } from './config';
import { IFrameClientServicesProxy } from './iframe-service-proxy';

/**
 * Converts config type to config object if needed.
 * NOTE: This is only used at the API boundary (not internally).
 */
// TODO(burdon): Factor out to `@dxos/config`.
export const fromConfig = (config?: Config | ConfigProto) => {
  return config instanceof Config ? config : new Config(config);
};

/**
 * Create services provider proxy connected via iFrame to host.
 */
export const fromIFrame = (config: Config | ConfigProto, channel = DEFAULT_CONFIG_CHANNEL): ClientServicesProvider => {
  if (typeof window === 'undefined') {
    // TODO(burdon): Client-specific error class.
    throw new Error('Cannot configure IFrame bridge outside of browser environment.');
  }

  return new IFrameClientServicesProxy({ config: fromConfig(config), channel });
};

/**
 * Creates stand-alone services without rpc.
 */
export const fromHost = (config: Config | ConfigProto): ClientServicesProvider => {
  return new ClientServicesHost({
    config: fromConfig(config),
    networkManager: createNetworkManager(fromConfig(config))
  });
};

/**
 * Creates a WebRTC network manager connected to the specified signal server.
 */
// TODO(burdon): Move to client-services and remove dependencies from here.
const createNetworkManager = (config: Config, options: Partial<NetworkManagerOptions> = {}): NetworkManager => {
  const signalServer = config.get('runtime.services.signal.server');
  if (signalServer) {
    const {
      log = true,
      signalManager = new WebsocketSignalManager([signalServer]),
      transportFactory = createWebRTCTransportFactory({
        iceServers: config.get('runtime.services.ice')
      })
    } = options;

    return new NetworkManager({ log, signalManager, transportFactory });
  }

  // TODO(burdon): Should not provide a memory signal manager since no shared context.
  //  Use TestClientBuilder for shared memory tests.
  log.warn('P2P network is not configured.');
  return new NetworkManager({
    signalManager: new MemorySignalManager(new MemorySignalManagerContext()),
    transportFactory: MemoryTransportFactory
  });
};
