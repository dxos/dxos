//
// Copyright 2022 DXOS.org
//

import { ClientServicesHost, ClientServicesProvider } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import {
  createWebRTCTransportFactory,
  MemoryTransportFactory,
  NetworkManager,
  NetworkManagerOptions
} from '@dxos/network-manager';

import { ClientIFrameServiceProxy } from '../proxies';
import { DEFAULT_CONFIG_CHANNEL } from './config';

/**
 * Create services provider proxy connected via iFrame to host.
 */
export const fromIFrame = (config: Config = new Config(), channel = DEFAULT_CONFIG_CHANNEL): ClientServicesProvider =>
  new ClientIFrameServiceProxy({ config, channel });

/**
 * Creates stand-alone services without rpc.
 */
export const fromHost = (config: Config = new Config()): ClientServicesProvider =>
  new ClientServicesHost({
    config,
    networkManager: createNetworkManager(config)
  });
/**
 * Creates a WebRTC network manager connected to the specified signal server.
 */
export const createNetworkManager = (config: Config, options: Partial<NetworkManagerOptions> = {}): NetworkManager => {
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
