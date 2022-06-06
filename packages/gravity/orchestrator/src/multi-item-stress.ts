//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { sleep } from '@dxos/async';
import { Bot, InProcessBotContainer } from '@dxos/botkit';
import { Item, Party } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';
import { SubscriptionGroup } from '@dxos/util';

import { INTERVAL_MS, ITEM_TYPE, SLACK_FOR_BOT_UPDATES_MS, SLEEP_TIME } from './constants';
import { Orchestrator } from './orchestrator';

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

function isAllFresh (party: Party) {
  const now = Date.now();
  const entities = party.database.select({
    type: ITEM_TYPE
  }).exec().entities;
  return entities.every((e) => e.model.getProperty('ts') > now - SLACK_FOR_BOT_UPDATES_MS);
}

async function multiItemStress () {
  const orchestrator = new Orchestrator(new InProcessBotContainer(() => new IsolatedPingBot()));
  await orchestrator.initialize();

  let botCount = 0;

  do {
    await orchestrator.spawnBot({});
    console.log(botCount++);
    await sleep(SLEEP_TIME);
  } while (isAllFresh(orchestrator.party));

  console.log('done');

  await orchestrator.stop();
}

void multiItemStress();
