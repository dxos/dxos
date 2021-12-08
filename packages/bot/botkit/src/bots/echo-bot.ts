//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { ObjectModel } from '@dxos/object-model';

import { SendCommandRequest } from '../proto/gen/dxos/bot';
import { ClientBot } from './client-bot';

const log = debug('dxos:echo-bot');

export class EchoBot extends ClientBot {
  constructor (private readonly _echoType: string) {
    super();
    log('Constructing echo bot');
  }

  override async onCommand (request: SendCommandRequest) {
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
