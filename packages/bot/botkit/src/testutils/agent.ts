//
// Copyright 2021 DXOS.org
//

import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { BotFactoryService } from '../proto/gen/dxos/bot';

export class BotFactoryAgent {
  private readonly _rpc: ProtoRpcClient<BotFactoryService>;

  constructor (port: RpcPort) {
    this._rpc = createRpcClient(
      schema.getService('dxos.bot.BotFactoryService'),
      {
        port: port
      }
    );
  }

  get botFactory (): BotFactoryService {
    return this._rpc.rpc;
  }

  async start (): Promise<void> {
    await this._rpc.open();
  }

  stop () {
    this._rpc.close();
  }
}
