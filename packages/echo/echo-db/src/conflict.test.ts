//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { ObjectModel } from '@dxos/object-model';

import { createModelTestBench } from './util';

describe('Conflicts', () => {
  // Fails: the final state is different for two peers.
  test.skip('object model', async () => {
    const { items: [item1, item2] } = await createModelTestBench({ model: ObjectModel });

    item1.model.modelUpdate.on(() => console.log(`m1 ${item1.model.getProperty('prop')}`));
    item2.model.modelUpdate.on(() => console.log(`m2 ${item2.model.getProperty('prop')}`));

    const updatesSettled = Promise.all([
      item1.model.modelUpdate.waitForCount(2),
      item2.model.modelUpdate.waitForCount(2)
    ]);

    await Promise.all([
      item1.model.setProperty('prop', 'foo'),
      item2.model.setProperty('prop', 'bar')
    ]);

    await updatesSettled;

    expect(item1.model.getProperty('prop')).toEqual(item2.model.getProperty('prop'));

    console.log(item1.model.getProperty('prop'));
    console.log(item2.model.getProperty('prop'));
  });
});
