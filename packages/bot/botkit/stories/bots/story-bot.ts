//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { ObjectModel } from '@dxos/object-model';

import { Bot } from '../../src';

const log = debug('dxos:bot:story-bot');

export class StoryBot extends Bot {
  constructor () {
    super();
    log('Constructing story bot.');
  }

  override async onStart () {
    log('Starting...');

    assert(this.party);
    const COUNTER_TYPE = 'DXOS_COUNTER';
    const counterItem = await this.party.database.createItem({
      type: COUNTER_TYPE,
      model: ObjectModel,
      props: {
        counter: 0
      }
    });

    // Subscribe to updates in ECHO and keep counter of occurrences of word DXOS.
    this.party.database.select({ type: 'TEST_TYPE' }).query().update.on(async result => {
      log('onUpdate triggered');

      let counter = 0;
      result.entities.forEach(item => {
        const textItem = item.model.get('text');
        if (typeof textItem === 'string') {
          log(`Found text item: ${textItem}`);
          counter += textItem.match(/DXOS/g)?.length ?? 0;
        }
      });

      if (counter !== counterItem.model.get('counter')) {
        log(`Updating counter with value ${counter}`);
        await counterItem.model.set('counter', counter);
      }
    });
  }
}
