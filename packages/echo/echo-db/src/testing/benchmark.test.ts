//
// Copyright 2022 DXOS.org
//

import { ObjectModel } from '@dxos/object-model';

import { ECHO } from '../echo';

const ITEMS = 100;
const MUTATIONS = 1000;

it.skip('Database benchmark', async () => {
  const echo = new ECHO({ snapshots: false });
  await echo.open();
  await echo.halo.createProfile();
  const party = await echo.createParty();

  const start = Date.now();
  for (let i = 0; i < ITEMS; i++) {
    const item = await party.database.createItem({ model: ObjectModel, type: 'test:item' });

    for (let j = 0; j < MUTATIONS; j++) {
      await item.model.set(`key${j % 100}`, `value-${j}`);
    }

    console.log(`${i * MUTATIONS}/${ITEMS * MUTATIONS} ${((Date.now() - start) / ((i + 1) * MUTATIONS / 1000)).toFixed(1)} µs/mut ${((i + 1) * MUTATIONS / (Date.now() - start) * 1000).toFixed(1)} mut/s`);
  }

  await echo.close();
});
