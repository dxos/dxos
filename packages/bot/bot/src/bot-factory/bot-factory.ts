//
// Copyright 2021 DXOS.org
//

import { BotHandle } from '../bot-handle';
import { Bot, BotFactoryService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';
import type { Empty } from '../proto/gen/google/protobuf';

/**
 * Handles creation and managing bots.
 */
export class BotFactory implements BotFactoryService {
  private readonly _bots: BotHandle[] = [];

  constructor (private readonly _botFactory: () => BotHandle) {}

  async GetBots (request: Empty) {
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
    return {};
  }

  async Stop (request: Bot) {
    return {};
  }

  async Remove (request: Bot) {
    return {};
  }

  async SendCommand (request: SendCommandRequest) {
    if (request.botId) {
      const bot = this._bots.find(bot => bot.bot.id === request.botId);
      if (!bot) {
        throw new Error('Bot not found');
      }
      await bot.rpc.Command(request);
    }
    return {};
  }
}
