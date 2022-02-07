//
// Copyright 2021 DXOS.org
//

import { createIpcPort } from '../bot-container';
import { BotService, InitializeRequest, SendCommandRequest, StartRequest } from '../proto/gen/dxos/bot';
import { startBot } from './start-bot';

/**
 * Bot that crashes the whole process on command.
 */
class FailingBot implements BotService {
  async Initialize (request: InitializeRequest) {
  }

  async Start (request: StartRequest) {
  }

  async Command (request: SendCommandRequest) {
    process.exit(255);

    return {};
  }

  async Stop () {
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  void startBot(new FailingBot(), createIpcPort(process));
}
