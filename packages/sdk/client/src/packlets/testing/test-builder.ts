//
// Copyright 2020 DXOS.org
//

import {
  ClientServices,
  ClientServicesHost,
  ClientServicesProxy,
  createDefaultModelFactory
} from '@dxos/client-services';
import { Config } from '@dxos/config';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { Storage } from '@dxos/random-access-storage';
import { createLinkedPorts, createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

import { Client } from '../client';

export const testConfigWithLocalSignal = new Config({
  version: 1,
  runtime: {
    services: {
      signal: {
        // TODO(burdon): Port numbers and global consts?
        server: 'ws://localhost:4000/.well-known/dx/signal'
      }
    }
  }
});

/**
 * Client builder supports different configurations, incl. signaling, transports, storage.
 */
export class TestBuilder {
  private readonly _config: Config;

  public storage?: Storage;

  // prettier-ignore
  constructor (
    config?: Config,
    private readonly _modelFactory = createDefaultModelFactory(),
    private readonly _signalManagerContext = new MemorySignalManagerContext()
  ) {
    this._config = config ?? new Config();
  }

  get config(): Config {
    return this._config;
  }

  /**
   * Get network manager using local shared memory or remote signal manager.
   */
  get networkManager() {
    const signalServer = this._config.get('runtime.services.signal.server');
    if (signalServer) {
      return new NetworkManager({
        log: true,
        signalManager: new WebsocketSignalManager([signalServer]),
        transportFactory: createWebRTCTransportFactory({
          iceServers: this._config.get('runtime.services.ice')
        })
      });
    }

    // Memory transport with shared context.
    return new NetworkManager({
      log: true,
      signalManager: new MemorySignalManager(this._signalManagerContext),
      transportFactory: MemoryTransportFactory
    });
  }

  /**
   * Create backend service handlers.
   */
  createClientServicesHost() {
    return new ClientServicesHost({
      config: this._config,
      modelFactory: this._modelFactory,
      networkManager: this.networkManager,
      storage: this.storage
    });
  }

  /**
   * Create client/server.
   */
  createClientServer(host: ClientServicesHost = this.createClientServicesHost()): [Client, ProtoRpcPeer<{}>] {
    const [proxyPort, hostPort] = createLinkedPorts();
    const server = createProtoRpcPeer({
      exposed: host.descriptors,
      handlers: host.services as ClientServices,
      port: hostPort
    });

    const client = new Client({ services: new ClientServicesProxy(proxyPort) });
    return [client, server];
  }
}
