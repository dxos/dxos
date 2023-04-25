//
// Copyright 2022 DXOS.org
//

import { User } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';
import { Space } from '@dxos/client';
import { Address, Contact } from '@dxos/kai-types';
import { List, ListItem, ListItemEndcap, ListItemHeading, Input } from '@dxos/react-appkit';
import { useQuery, observer } from '@dxos/react-client';

export const ContactList: FC<{ space: Space }> = ({ space }) => {
  const contacts: Contact[] = useQuery(space, Contact.filter());

  return (
    <List density='coarse' labelId='todo' slots={{ root: { className: 'is-full' } }}>
      {contacts.map((contact) => (
        <ContactListItem key={contact.id} contact={contact} />
      ))}
    </List>
  );
};

export const ContactListItem: FC<{ contact: Contact }> = observer(({ contact }) => {
  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <ListItem slots={{ root: { className: 'mbe-1 is-full' } }}>
      <ListItemEndcap>
        <User className={mx(getSize(5), 'mlb-2.5')} />
      </ListItemEndcap>
      <ListItemHeading>
        <Input
          variant='subdued'
          label='Contact name'
          labelVisuallyHidden
          value={contact.name}
          onChange={({ target: { value } }) => (contact.name = value)}
          slots={{
            input: { spellCheck: false }
          }}
        />
        <div role='none' className='text-sm text-secondary-text'>
          {contact.username && <p className='truncate'>{contact.username}</p>}
          {contact.email && <p className='truncate'>{contact.email}</p>}
          {contact.address && <p className='truncate'>{address(contact.address)}</p>}
        </div>
      </ListItemHeading>
    </ListItem>
  );
});
