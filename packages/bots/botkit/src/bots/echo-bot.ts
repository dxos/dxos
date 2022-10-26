//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { ObjectModel } from '@dxos/object-model';
import { SendCommandRequest } from '@dxos/protocols/proto/dxos/bot';

import { Bot } from './client-bot';

const log = debug('dxos:bot:echo-bot');

export class EchoBot extends Bot {
  constructor(private readonly _echoType: string) {
    super();
    log('Constructing echo bot');
  }

  override async onCommand(request: SendCommandRequest) {
    log('onCommand', request);
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
