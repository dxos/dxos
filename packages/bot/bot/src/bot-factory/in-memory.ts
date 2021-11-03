//
// Copyright 2021 DXOS.org
//

import { InMemoryBot } from '../bot-handle';
import { Bot, BotFactoryService, BotService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';
import type { Empty } from '../proto/gen/google/protobuf';

export interface BotInstance {
  bot: Bot,
  handle: BotService
}

// const factory = () => {
//   const bots: any[] = [];
//   return {
//     GetBots: async (request: Empty) => {
//       return {
//         bots: bots.map(bot => bot.bot)
//       };
//     }
//   }
// }

export class InMemoryBotFactory implements BotFactoryService {
  private readonly _bots: BotInstance[] = [];

  // Caveman mode
  // constructor () {
  //   this.GetBots = this.GetBots.bind(this);
  //   this.SpawnBot = this.SpawnBot.bind(this);
  // }

  async GetBots (request: Empty) {
    return {
      bots: this._bots.map(bot => bot.bot)
    };
  }

  async SpawnBot (request: SpawnBotRequest) {
    const handle = new InMemoryBot();
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
