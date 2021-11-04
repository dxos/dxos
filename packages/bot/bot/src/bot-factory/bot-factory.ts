//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';

import { BotHandle } from '../bot-handle';
import { Bot, BotFactoryService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';
import type { Empty } from '../proto/gen/google/protobuf';

export interface BotInstance {
  bot: Bot,
  handle: BotHandle
}

export class BotFactory implements BotFactoryService {
  private readonly _bots: BotInstance[] = [];

  constructor (private readonly _botHandleFactory: () => BotHandle) {}

  async GetBots (request: Empty) {
    return {
      bots: this._bots.map(bot => bot.bot)
    };
  }

  async SpawnBot (request: SpawnBotRequest) {
    const handle = this._botHandleFactory();
    await handle.open();
    await handle.rpc.Initialize({});
    const botId = PublicKey.random().toString();
    const bot: Bot = {
      id: botId,
      status: Bot.Status.RUNNING
    };
    this._bots.push({
      bot,
      handle
    });
    return bot;
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
      await bot.handle.rpc.Command({ botId: bot.bot.id });
    }
    return {};
  }
}
