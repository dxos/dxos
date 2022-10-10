//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { rmSync } from 'fs';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { createPersistentInstance } from './persistant-instance.js';

// TODO(burdon): Save data in repo to check if protocol has changed? Check protocol version.
const createData = async (storagePath: string) => {
  try {
    rmSync(storagePath, { recursive: true, force: true });
  } catch (err) {}

  const echo = createPersistentInstance(storagePath);
  await echo.open();

  await echo.halo.createProfile({
    username: 'test-user'
  });

  const party = await echo.createParty();
  const person = await party.database.createItem({
    model: ObjectModel,
    type: 'example:item/person',
    props: { firstName: 'Edith', lastName: 'Finch' }
  });

  await person.model.set('lastName', 'Smith');

  // TODO(dmaretskyi): Invitations do not work.
  // const otherPeer = new ECHO();
  // await otherPeer.open();
  // await otherPeer.halo.createProfile({ username: 'test-user-2' });
  // const invitation = await party.createInvitation();
  // await otherPeer.joinParty(invitation);
  // await otherPeer.close();

  const company = await party.database.createItem({
    model: ObjectModel,
    type: 'example:item/company',
    props: { name: 'DXOS' }
  });

  await party.database.createLink({ type: 'example:link/employee', source: person, target: company });

  await echo.close();
};

it.skip('can load from saved state', async function () {
  const storagePath = `/tmp/dxos/test-${Date.now()}`;
  await createData(storagePath);

  const echo = createPersistentInstance(storagePath);
  await echo.open();

  expect(echo.halo.getProfile()?.username).toEqual('test-user');

  const person: Item<ObjectModel> =
    echo.queryParties().first.database.select({ type: 'example:item/person' }).exec().entities[0];

  expect(person.model).toBeInstanceOf(ObjectModel);
  expect(person.model.toObject()).toEqual({ firstName: 'Edith', lastName: 'Smith' });

  expect(person.links).toHaveLength(1);
  expect(person.links[0].type).toEqual('example:link/employee');

  const company = person.links[0].target;
  expect(company.type).toEqual('example:item/company');
  expect(company.model.toObject()).toEqual({ name: 'DXOS' });

  await echo.close();
});
