//
// Copyright 2022 DXOS.org
//

import { User } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { List, ListItem } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Address, Contact } from '@dxos/kai-types';
import { Input } from '@dxos/react-appkit';
import { Space, useQuery } from '@dxos/react-client/echo';

export const ContactList: FC<{ space: Space }> = ({ space }) => {
  const contacts: Contact[] = useQuery(space, Contact.filter());

  return (
    <List density='coarse' aria-labelledby='todo' classNames='is-full'>
      {contacts.map((contact) => (
        <ContactListItem key={contact.id} contact={contact} />
      ))}
    </List>
  );
};

export const ContactListItem: FC<{ contact: Contact }> = ({ contact }) => {
  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <ListItem.Root classNames='mbe-1 is-full'>
      <ListItem.Endcap>
        <User className={mx(getSize(5), 'mlb-2.5')} />
      </ListItem.Endcap>
      <ListItem.Heading>
        <Input
          variant='subdued'
          label='Contact name'
          labelVisuallyHidden
          value={contact.name}
          onChange={({ target: { value } }) => (contact.name = value)}
          slots={{
            input: { spellCheck: false },
          }}
        />
        <div role='none' className='text-sm text-secondary-text'>
          {contact.username && <p className='truncate'>{contact.username}</p>}
          {contact.email && <p className='truncate'>{contact.email}</p>}
          {contact.address && <p className='truncate'>{address(contact.address)}</p>}
        </div>
      </ListItem.Heading>
    </ListItem.Root>
  );
};
