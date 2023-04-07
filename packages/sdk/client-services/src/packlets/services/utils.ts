//
// Copyright 2022 DXOS.org
//

import { ClientServicesProvider } from '@dxos/client';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import {
  createWebRTCTransportFactory,
  MemoryTransportFactory,
  NetworkManager,
  NetworkManagerOptions
} from '@dxos/network-manager';

import { LocalClientServices } from './local-client-services';

/**
 * Creates stand-alone services without rpc.
 */
export const fromHost = (config: Config = new Config()): ClientServicesProvider => {
  return new LocalClientServices({
    config,
    networkManager: createNetworkManager(config)
  });
};

/**
 * Creates a WebRTC network manager connected to the specified signal server.
 */
// TODO(burdon): Move to client-services and remove dependencies from here.
const createNetworkManager = (config: Config, options: Partial<NetworkManagerOptions> = {}): NetworkManager => {
  const signalServers = config.get('runtime.services.signal.servers');
  if (signalServers) {
    const {
      log = true,
      signalManager = new WebsocketSignalManager(signalServers),
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
