//
// Copyright 2021 DXOS.org
//

import type { Bot, BotFactoryService, SendCommandRequest, SpawnBotRequest } from '../proto/gen/dxos/bot';
import type { Empty } from '../proto/gen/google/protobuf';

export class InMemoryBotFactory implements BotFactoryService {
  async GetBots (request: Empty) {
    return {};
  }

  async SpawnBot (request: SpawnBotRequest) {
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
