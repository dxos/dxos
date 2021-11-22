//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { ObjectModel } from '@dxos/object-model';

import { createIpcPort } from '../bot-container';
import { SendCommandRequest } from '../proto/gen/dxos/bot';
import { ClientBot } from './client-bot';
import { startBot } from './start-bot';

export class EchoBot extends ClientBot {
  constructor (private readonly _echoType: string) {
    super();
  }

  override async onCommand (request: SendCommandRequest) {
    assert(this.party, 'Bot is not initialized');
    assert(request.command, 'Command must be provided');

    await this.party.database.createItem({
      model: ObjectModel,
      type: this._echoType,
      props: {
        payload: request.command
      }
    });

    return { response: request.command };
  }
}

export const TEST_ECHO_TYPE = 'bot/text';

if (typeof require !== 'undefined' && require.main === module) {
  void startBot(new EchoBot(TEST_ECHO_TYPE), createIpcPort(process));
}
