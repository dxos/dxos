//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { Bot, BotService } from '../proto/gen/dxos/bot';

/**
 * Represents a running bot instance in BotFactory.
 */
export class BotHandle {
  private readonly _rpc: ProtoRpcClient<BotService>;
  private readonly _bot: Bot;

  constructor (port: RpcPort, id: string) {
    this._rpc = createRpcClient(
      schema.getService('dxos.bot.BotService'),
      {
        port,
        timeout: 10000
      }
    );

    this._bot = {
      id,
      status: Bot.Status.STOPPED
    };
  }

  get rpc () {
    return this._rpc.rpc;
  }

  get bot () {
    return this._bot;
  }

  async open (): Promise<void> {
    await this._rpc.open();
    this._bot.status = Bot.Status.RUNNING;
  }

  async close () {
    this._rpc.close();
  }

  toString () {
    return `BotHandle: ${this._bot.id}`;
  }
}
