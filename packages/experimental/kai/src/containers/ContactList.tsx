//
// Copyright 2022 DXOS.org
//

import { User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Input, CardRow } from '../components';
import { useSpace } from '../hooks';
import { Address, Contact } from '../proto';

export const ContactList: FC = () => {
  const space = useSpace();
  const contacts: Contact[] = useQuery(space, Contact.filter());

  return (
    <div className='mt-2'>
      {contacts.map((contact) => (
        <div key={contact[id]} className='border-b'>
          <ContactRow contact={contact} />
        </div>
      ))}
    </div>
  );
};

export const ContactRow: FC<{ contact: Contact }> = withReactor(({ contact }) => {
  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <CardRow
      sidebar={
        <div className='flex flex-shrink-0 justify-center w-6'>
          <User className={getSize(5)} />
        </div>
      }
      header={
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={contact.name}
          onChange={(value) => (contact.name = value)}
        />
      }
    >
      <div className='ml-8 mb-1'>
        {contact.username && <div className='flex text-sm text-green-800'>{contact.username}</div>}
        {contact.email && <div className='flex text-sm text-green-800'>{contact.email}</div>}
        {contact.address && <div className='flex text-sm text-gray-800'>{address(contact.address)}</div>}
      </div>
    </CardRow>
  );
});
