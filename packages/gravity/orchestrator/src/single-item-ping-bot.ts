//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Bot, createIpcPort, startBot } from '@dxos/botkit';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { SubscriptionGroup } from '@dxos/util';

import { INTERVAL_MS, ITEM_TYPE } from './constants';

const log = debug('dxos:gravity:single-item-ping-bot');

export class SingleItemPingBot extends Bot {
  private subscriptionGroup = new SubscriptionGroup();

  override async onStart (): Promise<void> {
    assert(this.party, 'no party');
    assert(this.client?.halo.profile, 'no profile');

    const item: Item<ObjectModel> =
      this.party.database
        .select({ type: ITEM_TYPE })
        .exec()
        .expectOne();
    const interval = setInterval(async () => {
      assert(this.id !== undefined);
      await item.model.set(this.id, Date.now());
    }, INTERVAL_MS);
    this.subscriptionGroup.push(() => clearInterval(interval));
  }

  override async onStop (): Promise<void> {
    this.subscriptionGroup.unsubscribe();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  const port = createIpcPort(process);
  log('Starting client bot');
  void startBot(new SingleItemPingBot(), port);
}
