//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { createLinkedPorts, createRpcServer, RpcPort } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { BotPackageSpecifier, BotService } from '../proto/gen/dxos/bot';
import { BotExitStatus, BotContainer } from './bot-container';

export class InProcessBotContainer implements BotContainer {
  private readonly _bots = new Map<string, BotService>();

  constructor (private readonly _createBot: () => BotService) { }

  readonly error = new Event<[id: string, error: Error]>();
  readonly exited = new Event<[id: string, status: BotExitStatus]>();

  async spawn (pkg: BotPackageSpecifier, id: string): Promise<RpcPort> {
    const [botHandlePort, botPort] = createLinkedPorts();

    const botService = this._createBot();

    const rpc = createRpcServer({
      service: schema.getService('dxos.bot.BotService'),
      handlers: botService,
      port: botPort
    });
    void rpc.open();

    this._bots.set(id, botService);

    return botHandlePort;
  }

  async kill (id: string) {
    if (!this._bots.has(id)) {
      throw new Error(`Bot ${id} not found`);
    }

    this._bots.delete(id);
    this.exited.emit([id, {
      code: null,
      signal: null
    }]);
  }

  killAll () {
    for (const id of Array.from(this._bots.keys())) {
      void this.kill(id);
    }
  }
}
