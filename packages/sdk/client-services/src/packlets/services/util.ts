//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';

// TODO(burdon): Remove (no memory defaults).
const memorySignalManagerContext = new MemorySignalManagerContext();

/**
 * @deprecated
 */
// TODO(burdon): Move util to NetworkManager
export const createNetworkManager = (config: Config): NetworkManager => {
  const signalServer = config.get('runtime.services.signal.server');
  if (!signalServer) {
    log.warn('DEPRECATED: falling back to MemorySignalManager');
    return new NetworkManager({
      log: true,
      signalManager: new MemorySignalManager(memorySignalManagerContext),
      transportFactory: MemoryTransportFactory
    });
  }
  assert(signalServer);

  return new NetworkManager({
    log: true,
    signalManager: new WebsocketSignalManager([signalServer]),
    transportFactory: createWebRTCTransportFactory({
      iceServers: config.get('runtime.services.ice')
    })
  });
};
