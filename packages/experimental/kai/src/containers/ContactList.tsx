//
// Copyright 2022 DXOS.org
//

import { PlusCircle, User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery, useReactor } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui';

import { Card, Input, TableRow } from '../components';
import { useSpace } from '../hooks';
import { Address, Contact, createContact } from '../proto';

export const ContactList: FC<{}> = () => {
  const { space } = useSpace();
  const contacts: Contact[] = useQuery(space, Contact.filter());

  const handleCreate = async () => {
    return createContact(space.experimental.db);
  };

  const Menubar = () => (
    <button className='mr-2' onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title='Contacts' className='bg-blue-400' menubar={<Menubar />}>
      <div className='mt-2'>
        {contacts.map((contact) => (
          <div key={contact[id]} className='border-b'>
            <Person person={contact} />
          </div>
        ))}
      </div>
    </Card>
  );
};

export const Person: FC<{ person: Contact }> = ({ person }) => {
  const { render } = useReactor();
  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return render(
    <TableRow
      sidebar={
        <div className='flex flex-shrink-0 justify-center w-6'>
          <User className={getSize(5)} />
        </div>
      }
      header={
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={person.name}
          onChange={(value) => (person.name = value)}
        />
      }
    >
      <div className='ml-8 mb-1'>
        {person.username && <div className='flex text-sm text-green-800'>{person.username}</div>}
        {person.email && <div className='flex text-sm text-green-800'>{person.email}</div>}
        {person.address && <div className='flex text-sm text-gray-800'>{address(person.address)}</div>}
      </div>
    </TableRow>
  );
};
