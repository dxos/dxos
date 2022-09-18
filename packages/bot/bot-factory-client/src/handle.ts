//
// Copyright 2021 DXOS.org
//

import { BotFactoryService } from '@dxos/protocols/proto/dxos/bot';
import { ProtoRpcPeer } from '@dxos/rpc';

export class BotHandle {
  constructor (
    private readonly _id: string,
    private _rpc: ProtoRpcPeer<BotFactoryService>
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
