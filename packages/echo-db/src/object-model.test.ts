//
// Copyright 2020 DXOS.org
//

import { ObjectModel } from './object-model';
import { dxos } from './proto/gen/echo';

test('ObjectModel', async () => {
  const TYPE_TEST_ECHO_OBJECT = 'wrn_dxos_org_test_echo_object';
  const model = new ObjectModel();

  const waitForAppend = new Promise(resolve => {
    let i = 0;
    model.on('append', async (message: dxos.echo.IObjectMutation) => {
      await model.onUpdate([message]);
      i++;
      if (i === 2) {
        resolve();
      }
    });
  });

  // this should be async, we are appending a message to a feed that's async
  const itemId = model.createItem(TYPE_TEST_ECHO_OBJECT, { prop1: 'prop1value' });
  // this should be async, we are appending a message to a feed that's async
  model.updateItem(itemId, { prop2: 'prop2value' });

  await waitForAppend;

  const objects = model.getObjectsByType(TYPE_TEST_ECHO_OBJECT);
  expect(objects.length).toBe(1);
  const object = objects[0];
  expect(object).toHaveProperty('properties');
  expect(object.properties).toHaveProperty('prop1', 'prop1value');
  expect(object.properties).toHaveProperty('prop2', 'prop2value');

  // Check that getItem gives the same info.
  expect(object).toEqual(model.getItem(itemId));
});
