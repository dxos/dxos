//
// Copyright 2021 DXOS.org
//

import { clientServiceBundle, ClientServices } from '@dxos/client';
import { RpcPort, createBundledRpcServer, RpcPeer } from '@dxos/rpc';

export class RpcClientAPI {
  constructor (private readonly _port: RpcPort, private readonly _clientServices: ClientServices) {}

  async run () {
    const server: RpcPeer = createBundledRpcServer({
      services: clientServiceBundle,
      handlers: this._clientServices,
      port: this._port
    });

    await server.open();
  }
}
