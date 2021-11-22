//
// Copyright 2021 DXOS.org
//

import { createIpcPort } from '../bot-container';
import { BotService, InitializeRequest, SendCommandRequest, SendCommandResponse } from '../proto/gen/dxos/bot';
import { startBot } from './start-bot';

export class EmptyBot implements BotService {
  async Initialize (request: InitializeRequest) {
    await this.onInit(request);
  }

  async Command (request: SendCommandRequest) {
    const response = await this.onCommand(request);
    return response;
  }

  async Stop () {
    await this.onStop();
  }

  protected async onInit (request: InitializeRequest) {}
  protected async onCommand (request: SendCommandRequest): Promise<SendCommandResponse> {
    return { response: request.command };
  }

  protected async onStop () {}
}

if (typeof require !== 'undefined' && require.main === module) {
  void startBot(new EmptyBot(), createIpcPort(process));
}
