//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Bot, createIpcPort, startBot } from '@dxos/botkit';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { SubscriptionGroup } from '@dxos/util';

import { INTERVAL_MS, ITEM_TYPE } from './constants';

const log = debug('dxos:gravity:isolated-ping-bot');

export class IsolatedPingBot extends Bot {
  private subscriptionGroup = new SubscriptionGroup();

  override async onStart (): Promise<void> {
    assert(this.party, 'no party');
    assert(this.client?.halo.profile, 'no profile');

    const item: Item<ObjectModel> =
      await this.party.database.createItem({
        model: ObjectModel,
        type: ITEM_TYPE,
        props: {
          botId: this.id,
          ts: Date.now()
        }
      });
    const interval = setInterval(async () => {
      assert(this.id !== undefined);
      await item.model.set('ts', Date.now());
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
  void startBot(new IsolatedPingBot(), port);
}
