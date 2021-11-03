//
// Copyright 2021 DXOS.org
//

import { BotService, InitializeRequest, SendCommandRequest } from './proto/gen/dxos/bot';

export class Bot implements BotService {
  async Initialize (request: InitializeRequest) {
    return {};
  }

  async Command (request: SendCommandRequest) {
    return {};
  }
}
