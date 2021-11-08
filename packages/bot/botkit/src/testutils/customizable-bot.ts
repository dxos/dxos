//
// Copyright 2021 DXOS.org
//

import { RpcPort, RpcPeer, createRpcServer } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { BotService } from '../proto/gen/dxos/bot';

export class InMemoryCustomizableBot {
  private readonly _rpc: RpcPeer;

  constructor (port: RpcPort, handlers: BotService) {
    this._rpc = createRpcServer({
      service: schema.getService('dxos.bot.BotService'),
      handlers,
      port
    });
  }

  async open (): Promise<void> {
    await this._rpc.open();
  }
}
