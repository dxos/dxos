//
// Copyright 2021 DXOS.org
//

import { Client, clientServiceBundle, ClientServices } from '@dxos/client';
import { createBundledRpcServer, RpcPort, RpcPeer } from '@dxos/rpc';

import { config } from './config';

export class BackgroundServer {
  private readonly _client: Client = new Client(config);

  // Active and potentially closed connections.
  private readonly _connections = new Set<RpcPeer>();

  public async open () {
    await this._client.initialize();
  }

  public async close () {
    await Promise.all(Array.from(this._connections).map(peer => peer.close()));

    await this._client.destroy();
  }

  /**
   * Handle incoming connection on provided port.
   *
   * Will block until connection handshake is completed.
   */
  public async handlePort (port: RpcPort) {
    const handlers: ClientServices = {
      ...this._client.services,
      ProfileService: {
        ...this._client.services.ProfileService,
        Reset: async () => {
          await this._client.services.ProfileService.Reset();
          // Override the Rest handler with a reload - Client does not recover properly after reset.
          window.location.reload();
        }
      }
    }

    const server = createBundledRpcServer({
      services: clientServiceBundle,
      handlers,
      port
    });
    this._connections.add(server);
    await server.open(); // This is blocks until the other client connects.
  }
}
