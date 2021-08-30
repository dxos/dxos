//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { waitForCondition } from '@dxos/async';
import { Bot, getConfig } from '@dxos/bot';
import { createId } from '@dxos/crypto';
import { MessengerModel } from '@dxos/messenger-model';

export const ITEM_TYPE = 'dxos.org/type/testing/object';
export const APPEND_COMMAND = 'append';
export const GET_ALL_COMMAND = 'get-all';

const log = debug('dxos:testing:test-agent');

// TODO(burdon): Comment.
class TestAgent extends Bot {
  /** @type {Item<MessengerModel>} */
  _item:any;

  constructor (config:any, options:any) {
    super(config, options);

    this.on('party', partyKey => {
      this._item = this._client!.echo!.getParty(partyKey)!
        .database.select(s => s.filter({ type: ITEM_TYPE }).items)
        .getValue()[0];
      this._client!.echo!.getParty(partyKey)!
        .database.select(s => s.filter({ type: ITEM_TYPE }).items).update.on(items => {
          this._item = items[0];
        });
    });
  }

  override async _preInit () {
    this._client!.registerModel(MessengerModel);
  }

  override async botCommandHandler (command:any) {
    log('Received command:', JSON.stringify(command));
    await waitForCondition(() => !!this._item);
    switch (command.type) {
      case APPEND_COMMAND: {
        await this._item.model.sendMessage({
          id: createId(), text: 'Hello world!', sender: 'Sender', timestamp: new Date().toString()
        });
        break;
      }

      case GET_ALL_COMMAND: {
        return this._item.model.messages;
      }

      default:
        break;
    }
  }
}

if (!module.parent) {
  void new TestAgent(getConfig(), {}).start();
}
