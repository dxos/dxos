//
// Copyright 2022 DXOS.org
//

import { PlusCircle, User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-db2';
import { getSize } from '@dxos/react-ui';

import { Card, Input, Table } from '../components';
import { useQuery, useSubscription, useSpace } from '../hooks';
import { Address, Contact, createContact } from '../proto';

export const ContactList: FC<{}> = () => {
  const { database: db } = useSpace();
  const contacts: Contact[] = useQuery(db, Contact.filter());

  const handleCreate = async () => {
    return createContact(db);
  };

  const Menubar = () => (
    <button className='mr-2' onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title='Contacts' className='bg-blue-400' menubar={<Menubar />}>
      <>
        {contacts.map((contact) => (
          <div key={contact[id]} className='p-2 pl-3 border-b'>
            <Person person={contact} />
          </div>
        ))}
      </>
    </Card>
  );
};

export const Person: FC<{ person: Contact }> = ({ person }) => {
  const { database: db } = useSpace();
  useSubscription(db, person);

  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <Table
      sidebar={<User className={getSize(5)} />}
      header={
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={person.name}
          onChange={(value) => (person.name = value)}
        />
      }
    >
      {person.username && <div className='flex text-sm text-green-800'>{person.username}</div>}
      {person.email && <div className='flex text-sm text-green-800'>{person.email}</div>}
      {person.address && <div className='flex text-sm text-gray-800'>{address(person.address)}</div>}
    </Table>
  );
};
