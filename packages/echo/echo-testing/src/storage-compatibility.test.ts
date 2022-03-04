//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { createPersistentInstance } from './persistant-instance';

test('can load from saved state', async () => {
  const storagePath = './saved-state';

  const echo = createPersistentInstance(storagePath);
  await echo.open();

  expect(echo.halo.getProfile()?.username).toEqual('Test profile');

  const person: Item<ObjectModel> = echo.queryParties().first.database.select({ type: 'dxos:item.person' }).query().entities[0];

  expect(person.model).toBeInstanceOf(ObjectModel);
  expect(person.model.toObject()).toEqual({ firstName: 'Edith', lastName: 'Smith' });

  expect(person.links).toHaveLength(1);
  expect(person.links[0].type).toEqual('dxos:link.employee');

  const company = person.links[0].target;
  expect(company.type).toEqual('dxos:item.company');
  expect(company.model.toObject()).toEqual({ name: 'DXOS' });

  await echo.close();
});
