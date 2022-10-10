//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { schema } from '@dxos/protocols';
import { BotService } from '@dxos/protocols/proto/dxos/bot';
import { createLinkedPorts, createRpcServer, RpcPort } from '@dxos/rpc';

import { BotExitStatus, BotContainer, SpawnOptions } from './bot-container.js';

export class InProcessBotContainer implements BotContainer {
  private readonly _bots = new Map<string, BotService>();

  constructor (private readonly _createBot: () => BotService) {}

  readonly error = new Event<[id: string, error: Error]>();
  readonly exited = new Event<[id: string, status: BotExitStatus]>();

  async spawn ({ id }: SpawnOptions): Promise<RpcPort> {
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
