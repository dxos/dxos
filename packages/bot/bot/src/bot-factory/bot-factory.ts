//
// Copyright 2021 DXOS.org
//

import { Bot, BotFactoryService, BotService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';
import type { Empty } from '../proto/gen/google/protobuf';

export interface BotInstance {
  bot: Bot,
  handle: BotService
}

export class BotFactory implements BotFactoryService {
  private readonly _bots: BotInstance[] = [];

  constructor (private readonly _botHandleFactory: () => BotService) {}

  async GetBots (request: Empty) {
    return {
      bots: this._bots.map(bot => bot.bot)
    };
  }

  async SpawnBot (request: SpawnBotRequest) {
    const handle = this._botHandleFactory();
    await handle.Initialize({});
    this._bots.push({
      bot: {
        status: Bot.Status.RUNNING
      },
      handle
    });
    return {};
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
    return {};
  }
}
