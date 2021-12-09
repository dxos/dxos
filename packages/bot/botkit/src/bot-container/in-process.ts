//
// Copyright 2021 DXOS.org
//

import { createLinkedPorts, createRpcServer } from '@dxos/rpc';

import { BotHandle } from '../bot-factory';
import { schema } from '../proto/gen';
import { BotPackageSpecifier, BotService } from '../proto/gen/dxos/bot';
import { BotContainer } from './bot-container';

export class InProcessBotContainer implements BotContainer {
  constructor (private readonly _createBot: () => BotService) { }

  async spawn (pkg: BotPackageSpecifier): Promise<BotHandle> {
    const [botHandlePort, botPort] = createLinkedPorts();

    const botService = this._createBot();

    const rpc = createRpcServer({
      service: schema.getService('dxos.bot.BotService'),
      handlers: botService,
      port: botPort
    });
    void rpc.open();

    return new BotHandle(botHandlePort);
  }

  killAll () {}
}
