//
// Copyright 2021 DXOS.org
//

import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { BotExitStatus } from '..';
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

  /**
   * Called when the process backing the bot exits.
   */
  onProcessExited (status: BotExitStatus) {
    this.bot.status = Bot.Status.STOPPED;
    this.bot.exitCode = status.code ?? undefined;
    this.bot.exitSignal = status.signal ?? undefined;
  }

  /**
   * Called when there's an critical error from the bot container backing the bot.
   */
  onProcessError (error: Error) {
    this.bot.status = Bot.Status.STOPPED;
    this.bot.error = error.stack;
  }
}
