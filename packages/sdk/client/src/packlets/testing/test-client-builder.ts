//
// Copyright 2020 DXOS.org
//

import { ClientServicesHost, ClientServicesProxy, createDefaultModelFactory } from '@dxos/client-services';
import { Config, ConfigProto } from '@dxos/config';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { createLinkedPorts, createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

import { Client } from '../client';

export const testConfigWithLocalSignal: ConfigProto = {
  version: 1,
  runtime: {
    services: {
      signal: {
        server: 'ws://localhost:4000/.well-known/dx/signal'
      }
    }
  }
};

// TODO(burdon): See feed-store builder pattern (for overrides).
export class TestClientBuilder {
  private readonly _config: Config;

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
      networkManager: this.networkManager
    });
  }

  /**
   * Create client/server.
   */
  createClientServer(host: ClientServicesHost = this.createClientServicesHost()): [Client, ProtoRpcPeer<{}>] {
    const [proxyPort, hostPort] = createLinkedPorts();
    const server = createProtoRpcPeer({
      exposed: host.descriptors,
      handlers: host.services,
      port: hostPort
    });

    const client = new Client({ services: new ClientServicesProxy(proxyPort) });
    return [client, server];
  }
}
