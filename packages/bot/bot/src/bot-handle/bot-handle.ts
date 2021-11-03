//
// Copyright 2021 DXOS.org
//

import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { BotService } from '../proto/gen/dxos/bot';

export class BotHandle {
  private readonly _rpc: ProtoRpcClient<BotService>;

  constructor (port: RpcPort) {
    this._rpc = createRpcClient(
      schema.getService('dxos.bot.BotService'),
      {
        port: port
      }
    );
  }

  get rpc () {
    return this._rpc.rpc;
  }

  async open (): Promise<void> {
    await this._rpc.open();
  }
}
