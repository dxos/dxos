//
// Copyright 2022 DXOS.org
//

import { sleep } from '@dxos/async';
import { NodeContainer } from '@dxos/botkit';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { ITEM_TYPE, SLACK_FOR_BOT_UPDATES_MS, SLEEP_TIME } from './constants';
import { Orchestrator } from './orchestrator';

const isAllFresh = (item: Item<ObjectModel>) => {
  const object = item.model.toObject();
  const now = Date.now();
  return Object.values(object).every((value) => value > now - SLACK_FOR_BOT_UPDATES_MS);
};

const singleItemStress = async () => {
  const orchestrator = new Orchestrator(new NodeContainer(['@swc-node/register']));
  await orchestrator.initialize();

  const item = await orchestrator.party.database.createItem({
    model: ObjectModel,
    type: ITEM_TYPE
  });

  let botCount = 0;

  do {
    await orchestrator.spawnBot({
      localPath: require.resolve('./single-item-ping-bot')
    });
    console.log(`botCount=${++botCount}`);
    await item.model.update.waitForCondition(() => Object.keys(item.model.toObject()).length === botCount);
    await sleep(SLEEP_TIME);
  } while (isAllFresh(item));

  console.log('done');

  await orchestrator.stop();
};

void singleItemStress();
