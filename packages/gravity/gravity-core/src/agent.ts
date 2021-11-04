//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { BotFactoryClient } from '@dxos/botkit-client-deprecated';

export class Agent {
  _botId: string;
  _botFactoryClient: BotFactoryClient;

  constructor (botFactoryClient: BotFactoryClient, botId: string) {
    this._botId = botId;
    this._botFactoryClient = botFactoryClient;
  }

  async sendCommand (data: Object) {
    const message = Buffer.from(JSON.stringify(data));

    const sendResult = await this._botFactoryClient.sendBotCommand(this._botId, message);
    const { message: { data: result, error } } = sendResult;
    if (error) {
      throw new Error(error);
    }

    assert(result);
    return JSON.parse(result.toString());
  }

  async stop () {
    await this._botFactoryClient.sendBotManagementRequest(this._botId, 'kill');
  }
}
