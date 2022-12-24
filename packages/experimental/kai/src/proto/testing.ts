//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { EchoDatabase } from '@dxos/echo-db2';

import { Contact, Task } from '../proto';
import { Project } from './gen/schema';

export const createProject = async (db: EchoDatabase) => {
  return await db.save(
    new Project({
      title: faker.commerce.productAdjective() + ' ' + faker.commerce.product()
    })
  );
};

export const createTask = async (db: EchoDatabase) => {
  const contacts = db.query(Contact.filter()).getObjects();
  const contact =
    faker.datatype.boolean() && contacts.length ? contacts[Math.floor(Math.random() * contacts.length)] : undefined;

  return await db.save(
    new Task({
      title: faker.lorem.sentence(2),
      assignee: contact
    })
  );
};

export const createContact = async (db: EchoDatabase) => {
  return await db.save(
    new Contact({
      name: faker.name.findName(),
      email: faker.datatype.boolean() ? faker.internet.email() : undefined,
      username: faker.datatype.boolean() ? '@' + faker.internet.userName() : undefined,
      address: faker.datatype.boolean()
        ? {
            city: faker.address.city(),
            state: faker.address.stateAbbr(),
            zip: faker.address.zipCode()
          }
        : undefined
    })
  );
};
