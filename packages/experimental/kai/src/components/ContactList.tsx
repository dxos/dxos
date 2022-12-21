//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { PlusCircle, User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-db2';
import { getSize } from '@dxos/react-ui';

import { useDatabase, useObjects, useSelection } from '../hooks';
import { Address, Contact } from '../proto/tasks';
import { Card, Table } from './Card';

export const ContactList: FC<{}> = () => {
  const db = useDatabase();
  const contacts = useObjects(Contact.filter());

  const handleCreate = async () => {
    await db.save(
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

  const Menubar = () => (
    <button className='mr-2' onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title='Contacts' color='bg-blue-400' menubar={<Menubar />}>
      <>
        {contacts.map((contact) => (
          <div key={id(contact)} className='p-2 pl-3 border-b'>
            <Person person={contact} />
          </div>
        ))}
      </>
    </Card>
  );
};

export const Person: FC<{ person: Contact }> = ({ person }) => {
  useSelection(person);

  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <Table
      sidebar={<User className={getSize(5)} />}
      header={
        <input
          className='w-full outline-0'
          spellCheck={false}
          value={person.name}
          onChange={(e) => (person.name = e.target.value)}
        />
      }
    >
      {person.username && <div className='flex text-sm text-green-800'>{person.username}</div>}
      {person.email && <div className='flex text-sm text-green-800'>{person.email}</div>}
      {person.address && <div className='flex text-sm text-gray-800'>{address(person.address)}</div>}
    </Table>
  );
};
