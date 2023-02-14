//
// Copyright 2022 DXOS.org
//

import { User } from 'phosphor-react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { getSize, List, ListItem, ListItemEndcap, ListItemHeading, Input, mx } from '@dxos/react-components';

import { Address, Contact } from '../../proto';

export const ContactList: FC<{ space: Space }> = ({ space }) => {
  const contacts: Contact[] = useQuery(space, Contact.filter());

  return (
    <List labelId='todo'>
      {contacts.map((contact) => (
        <ContactListItem key={contact[id]} contact={contact} />
      ))}
    </List>
  );
};

export const ContactListItem: FC<{ contact: Contact }> = withReactor(({ contact }) => {
  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <ListItem slots={{ root: { className: 'mbe-1' } }}>
      <ListItemEndcap>
        <User className={mx(getSize(5), 'mlb-2.5')} />
      </ListItemEndcap>
      <ListItemHeading>
        <Input
          variant='subdued'
          label='Contact name'
          value={contact.name}
          onChange={({ target: { value } }) => (contact.name = value)}
          slots={{
            root: { className: 'm-0' },
            input: { spellCheck: false, className: 'p-2' },
            label: { className: 'sr-only' }
          }}
        />
        <div role='none' className='px-2'>
          {contact.username && <div className='flex text-sm text-secondary-text'>{contact.username}</div>}
          {contact.email && <div className='flex text-sm text-secondary-text'>{contact.email}</div>}
          {contact.address && <div className='flex text-sm text-secondary-text'>{address(contact.address)}</div>}
        </div>
      </ListItemHeading>
    </ListItem>
  );
});
