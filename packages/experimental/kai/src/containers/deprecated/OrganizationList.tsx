//
// Copyright 2022 DXOS.org
//

import { Buildings, User } from 'phosphor-react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { useQuery, withReactor } from '@dxos/react-client';
import { getSize, List, ListItem, Input, ListItemEndcap, mx, ListItemHeading } from '@dxos/react-components';

import { Address, Organization } from '../../proto';

export const OrganizationList: FC<{ space: Space }> = ({ space }) => {
  const organizations: Organization[] = useQuery(space, Organization.filter());

  return (
    <List labelId='todo'>
      {organizations.map((organization) => (
        <OrganizationListItem key={organization.id} organization={organization} />
      ))}
    </List>
  );
};

export const OrganizationListItem: FC<{ organization: Organization }> = withReactor(({ organization }) => {
  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <ListItem>
      <ListItemEndcap>
        <Buildings className={mx(getSize(5), 'mbs-2.5')} />
      </ListItemEndcap>
      <ListItemHeading>
        <Input
          variant='subdued'
          label='Organization name'
          value={organization.name}
          onChange={({ target: { value } }) => (organization.name = value)}
          slots={{
            root: { className: 'm-0' },
            input: { spellCheck: false, className: 'p-1 mbs-1' },
            label: { className: 'sr-only' }
          }}
        />
        <div className='mis-1'>
          {organization.address && <p className='text-sm text-gray-800'>{address(organization.address)}</p>}

          {/* Contacts */}
          {organization.people?.length > 0 && (
            <List labelId='todo' slots={{ root: { className: 'mlb-1' } }}>
              {organization.people?.map((contact) => (
                <ListItem key={contact.id}>
                  <ListItemEndcap className={getSize(6)}>
                    <User className={mx(getSize(4), 'mbs-1')} />
                  </ListItemEndcap>
                  <ListItemHeading className='text-sm mbs-0.5'>{contact.name}</ListItemHeading>
                </ListItem>
              ))}
            </List>
          )}
        </div>
      </ListItemHeading>
    </ListItem>
  );
});
