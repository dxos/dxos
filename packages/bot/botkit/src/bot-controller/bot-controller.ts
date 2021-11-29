//
// Copyright 2021 DXOS.org
//

import { createRpcServer, RpcPeer, RpcPort } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { BotFactoryService } from '../proto/gen/dxos/bot';

/**
 * Exposes BotFactoryService for external agents.
 */
export class BotController {
  private readonly _rpc: RpcPeer;

  constructor (botFactory: BotFactoryService, port: RpcPort) {
    this._rpc = createRpcServer({
      service: schema.getService('dxos.bot.BotFactoryService'),
      handlers: botFactory,
      port,
      timeout: 60000
    });
  }

  async start (): Promise<void> {
    await this._rpc.open();
  }
}
