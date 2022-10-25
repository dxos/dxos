//
// Copyright 2021 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import {
  BotReport,
  BotService,
  InitializeRequest,
  SendCommandRequest,
  SendCommandResponse,
  StartRequest
} from '@dxos/protocols/proto/dxos/bot';

import { createIpcPort } from '../bot-container';
import { startBot } from './start-bot';

export class EmptyBot implements BotService {
  async initialize(request: InitializeRequest) {
    await this.onInit(request);
  }

  async start(request: StartRequest) {
    await this.onInit(request);
  }

  async command(request: SendCommandRequest) {
    const response = await this.onCommand(request);
    return response;
  }

  async stop() {
    await this.onStop();
  }

  protected async onInit(request: InitializeRequest) {}
  protected async onCommand(request: SendCommandRequest): Promise<SendCommandResponse> {
    return { response: request.command };
  }

  protected async onStop() {}

  startReporting(): Stream<BotReport> {
    return new Stream(() => {});
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  void startBot(new EmptyBot(), createIpcPort(process));
}
