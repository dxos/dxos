//
// Copyright 2021 DXOS.org
//

import { schema, DevtoolsHost } from '@dxos/devtools';
import { RpcPort, createRpcServer, RpcPeer } from '@dxos/rpc';

import { DevtoolsHostEvents } from '@dxos/client';

export class RpcClientAPI {
  constructor (private readonly _port: RpcPort, private readonly _devtoolsHost: DevtoolsHost, private readonly _events: DevtoolsHostEvents) {}

  async run () {
    const service = schema.getService('dxos.devtools.DevtoolsHost');
    const server: RpcPeer = createRpcServer({
      service,
      handlers: this._devtoolsHost,
      port: this._port
    });

    await server.open();
    this._events.ready.emit();
  }
}
