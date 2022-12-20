//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { Plus, User } from 'phosphor-react';
import React, { FC } from 'react';

import { db, id } from '@dxos/echo-db2';
import { getSize } from '@dxos/react-ui';

import { useDatabase, useObjects, useSelection } from '../hooks';
import { Address, Contact } from '../proto/tasks';
import { Card } from './Card';

export const ContactList: FC<{}> = () => {
  const db = useDatabase();
  const contacts = useObjects(db, Contact.filter());

  const handleCreate = async () => {
    await db.save(
      new Contact({
        name: faker.name.findName(),
        email: faker.internet.email(),
        username: '@' + faker.internet.userName(),
        address: {
          city: faker.address.city(),
          state: faker.address.stateAbbr(),
          zip: faker.address.zipCode()
        }
      })
    );
  };

  const Menubar = () => (
    <div className='flex p-2 bg-orange-400'>
      <h2>Contacts</h2>
      <div className='flex-1' />
      <button className='mr-2' onClick={handleCreate}>
        <Plus className={getSize(5)} />
      </button>
    </div>
  );

  return (
    <Card menubar={<Menubar />}>
      <>
        {contacts.map((contact) => (
          <Person key={id(contact)} person={contact} />
        ))}
      </>
    </Card>
  );
};

export const Person: FC<{ person: Contact }> = ({ person }) => {
  useSelection(db(person), person);

  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <div className='flex flex-col p-2 bg-white'>
      <div className='flex items-center'>
        <User className='mr-3' />
        <input className='w-full outline-0' value={person.name} onChange={(e) => (person.name = e.target.value)} />
      </div>
      <div className='flex ml-7 text-sm text-blue-800'>{person.username}</div>
      <div className='flex ml-7 text-sm text-blue-800'>{person.email}</div>
      <div className='flex ml-7 text-sm text-blue-800'>{address(person.address)}</div>
    </div>
  );
};
