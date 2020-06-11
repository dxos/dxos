//
// Copyright 2020 DxOS.org
//

import { dxos } from './proto/gen/echo';
import { EchoModel } from './model';

test.skip('EchoModel', () => {
  const TYPE_TEST_ECHO_OBJECT = 'wrn_dxos_org_test_echo_object';
  const model = new EchoModel();
  // Loopback messages, mocking data-client/ModelFactory
  // what are we waiting here? EventEmitter don't wait for promises.
  model.on('append', async (message: dxos.echo.IObjectMutation) => {
    await model.onUpdate([message]);
  });
  // this should be async, we are appending a message to a feed that's async
  const itemId = model.createItem(TYPE_TEST_ECHO_OBJECT, { prop1: 'prop1value' });
  // this should be async, we are appending a message to a feed that's async
  model.updateItem(itemId, { prop2: 'prop2value' });
  const objects = model.getObjectsByType(TYPE_TEST_ECHO_OBJECT);
  expect(objects.length).toBe(1);
  const object = objects[0];
  expect(object).toHaveProperty('properties');
  expect(object.properties).toHaveProperty('prop1', 'prop1value');
  expect(object.properties).toHaveProperty('prop2', 'prop2value');
});
