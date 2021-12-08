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

  override async onInit() {
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
    this.party.database.select(s => s.filter({ type: 'TEST_TYPE' }).items).update.on(data => {
      log('onUpdate triggered');
      let counter = 0;
      for(const item in data) {
        log('Found item:', item);
        counter += item.match(/DXOS/g)?.length ?? 0;
      }
      log(`Updating counter with value ${counter}`);
      counterItem.model.setProperty('counter', counter);
    });
  }
}
