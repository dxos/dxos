//
// Copyright 2021 DXOS.org
//

import { schema, DevtoolsHost } from '@dxos/devtools';
import { RpcPort, createRpcServer, RpcPeer } from '@dxos/rpc';

export class RpcClientAPI {
  constructor (private readonly _port: RpcPort, private readonly _devtoolsHost: DevtoolsHost) {}

  async run () {
    const service = schema.getService('dxos.devtools.DevtoolsHost');
    const server: RpcPeer = createRpcServer({
      service,
      handlers: this._devtoolsHost,
      port: this._port
    });

    await server.open();
  }
}
