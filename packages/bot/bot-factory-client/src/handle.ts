//
// Copyright 2021 DXOS.org
//

import { ProtoRpcClient } from '@dxos/rpc';

import { BotFactoryService } from './proto/gen/dxos/bot';

export class BotHandle {
  constructor (
    private readonly _id: string,
    private _rpc: ProtoRpcClient<BotFactoryService>
  ) {}

  get id (): string {
    return this._id;
  }

  async start () {
    await this._rpc.rpc.start({
      id: this._id
    });
  }

  async stop () {
    await this._rpc.rpc.stop({
      id: this._id
    });
  }

  async remove () {
    await this._rpc.rpc.remove({
      id: this._id
    });
  }

  async sendCommand (command: Uint8Array) {
    const { response } = await this._rpc.rpc.sendCommand({
      botId: this._id,
      command
    });
    return response;
  }

  logsStream () {
    return this._rpc.rpc.getLogs({
      botId: this._id
    });
  }
}
