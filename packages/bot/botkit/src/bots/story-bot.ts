//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { ObjectModel } from '@dxos/object-model';

import { ClientBot } from './client-bot';

const log = debug('dxos:story-bot');

export class StoryBot extends ClientBot {
  constructor () {
    super();
    log('constructing story bot');
  }

  override async onInit () {
    log('onInit');
    assert(this.party);
    const COUNTER_TYPE = 'DXOS_COUNTER';
    const counterItem = await this.party.database.createItem({
      type: COUNTER_TYPE,
      model: ObjectModel,
      props: {
        counter: 0
      }
    });
    this.party.database.select(s => s.filter({ type: 'TEST_TYPE' }).items).update.on(async (data) => {
      log('onUpdate triggered');
      let counter = 0;
      data.forEach(item => {
        const textItem = item.model.getProperty('text');
        if (typeof textItem === 'string') {
          log(`Found text item: ${textItem}`);
          counter += textItem.match(/DXOS/g)?.length ?? 0;
        }
      });
      if (counter !== counterItem.model.getProperty('counter')) {
        log(`Updating counter with value ${counter}`);
        await counterItem.model.setProperty('counter', counter);
      }
    });
  }
}
