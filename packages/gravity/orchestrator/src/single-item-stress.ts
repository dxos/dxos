//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { sleep } from '@dxos/async';
import { Bot, InProcessBotContainer } from '@dxos/botkit';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { SubscriptionGroup } from '@dxos/util';

import { INTERVAL_MS, ITEM_TYPE, SLACK_FOR_BOT_UPDATES_MS, SLEEP_TIME } from './constants';
import { Orchestrator } from './orchestrator';

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

function isAllFresh (item: Item<ObjectModel>) {
  const object = item.model.toObject();
  const now = Date.now();
  return Object.values(object).every((value) => value > now - SLACK_FOR_BOT_UPDATES_MS);
}

async function singleItemStress () {
  const orchestrator = new Orchestrator(new InProcessBotContainer(() => new SingleItemPingBot()));
  await orchestrator.initialize();

  const item = await orchestrator.party.database.createItem({
    model: ObjectModel,
    type: ITEM_TYPE
  });

  let botCount = 0;

  do {
    await orchestrator.spawnBot({});
    console.log(botCount++);
    await item.model.update.waitForCondition(() => Object.keys(item.model.toObject()).length === botCount);
    await sleep(SLEEP_TIME);
  } while (isAllFresh(item));

  console.log('done');

  await orchestrator.stop();
}

void singleItemStress();
