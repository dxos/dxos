//
// Copyright 2022 DXOS.org
//

import { ClientServicesProvider } from '@dxos/client';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManagerOptions } from '@dxos/network-manager';

import { LocalClientServices } from './local-client-services';

/**
 * Creates stand-alone services without rpc.
 */
export const fromHost = (config: Config = new Config()): ClientServicesProvider => {
  return new LocalClientServices({
    config,
    ...setupNetworking(config)
  });
};

/**
 * Creates signal manager and transport factory based on config.
 * These are used to create a WebRTC network manager connected to the specified signal server.
 */
const setupNetworking = (config: Config, options: Partial<NetworkManagerOptions> = {}) => {
  const signals = config.get('runtime.services.signaling');
  if (signals) {
    const {
      signalManager = new WebsocketSignalManager(signals),
      transportFactory = createWebRTCTransportFactory({
        iceServers: config.get('runtime.services.ice')
      })
    } = options;

    return {
      signalManager,
      transportFactory
    };
  }

  // TODO(burdon): Should not provide a memory signal manager since no shared context.
  //  Use TestClientBuilder for shared memory tests.
  log.warn('P2P network is not configured.');
  const signalManager = new MemorySignalManager(new MemorySignalManagerContext());
  const transportFactory = MemoryTransportFactory;
  return {
    signalManager,
    transportFactory
  };
};
