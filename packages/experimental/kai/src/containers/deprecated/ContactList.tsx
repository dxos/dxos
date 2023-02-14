//
// Copyright 2022 DXOS.org
//

import { User } from 'phosphor-react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Input, CardRow } from '../../components';
import { Address, Contact } from '../../proto';

export const ContactList: FC<{ space: Space }> = ({ space }) => {
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
      sidebar={<User className={getSize(5)} />}
      header={
        <Input
          className='w-full p-1'
          spellCheck={false}
          value={contact.name}
          onChange={(value) => (contact.name = value)}
        />
      }
    >
      <div className='ml-9 mb-1'>
        {contact.username && <div className='flex text-sm text-secondary-text'>{contact.username}</div>}
        {contact.email && <div className='flex text-sm text-secondary-text'>{contact.email}</div>}
        {contact.address && <div className='flex text-sm text-secondary-text'>{address(contact.address)}</div>}
      </div>
    </CardRow>
  );
});
