//
// Copyright 2021 DXOS.org
//

import { createIpcPort } from '../bot-container';
import { BotService, InitializeRequest, SendCommandRequest, SendCommandResponse } from '../proto/gen/dxos/bot';
import { startBot } from './start-bot';

class FailingBot implements BotService {
  async Initialize (request: InitializeRequest) {
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
