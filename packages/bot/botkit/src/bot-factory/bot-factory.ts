//
// Copyright 2021 DXOS.org
//

import { BotHandle } from '../bot-handle';
import { Bot, BotFactoryService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';

/**
 * Handles creation and managing bots.
 */
export class BotFactory implements BotFactoryService {
  private readonly _bots: BotHandle[] = [];

  constructor (private readonly _botFactory: () => BotHandle) {}

  async GetBots () {
    return {
      bots: this._bots.map(handle => handle.bot)
    };
  }

  async SpawnBot (request: SpawnBotRequest) {
    const handle = this._botFactory();
    await handle.open();
    await handle.rpc.Initialize(request);
    this._bots.push(handle);
    return handle.bot;
  }

  async Start (request: Bot) {
    return request;
  }

  async Stop (request: Bot) {
    return request;
  }

  async Remove (request: Bot) {}

  async SendCommand (request: SendCommandRequest) {
    if (request.botId) {
      const bot = this._bots.find(bot => bot.bot.id === request.botId);
      if (!bot) {
        throw new Error('Bot not found');
      }
      const respone = await bot.rpc.Command(request);
      return respone;
    }
    return {};
  }
}
