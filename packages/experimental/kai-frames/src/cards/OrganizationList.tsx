//
// Copyright 2022 DXOS.org
//

import { Buildings, User } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { List, ListItem, ListItemEndcap, ListItemHeading } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { Space } from '@dxos/client';
import { Address, Organization } from '@dxos/kai-types';
import { Input } from '@dxos/react-appkit';
import { useQuery, observer } from '@dxos/react-client';

export const OrganizationList: FC<{ space: Space }> = ({ space }) => {
  const organizations: Organization[] = useQuery(space, Organization.filter());

  return (
    <List aria-labelledby='todo' density='coarse'>
      {organizations.map((organization) => (
        <OrganizationListItem key={organization.id} organization={organization} />
      ))}
    </List>
  );
};

export const OrganizationListItem: FC<{ organization: Organization }> = observer(({ organization }) => {
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
          labelVisuallyHidden
          value={organization.name}
          onChange={({ target: { value } }) => (organization.name = value)}
          slots={{
            input: { spellCheck: false }
          }}
        />
        <div>
          {organization.address && <p className='text-sm text-gray-800'>{address(organization.address)}</p>}

          {/* Contacts */}
          {organization.people?.length > 0 && (
            <List density='fine' aria-labelledby='todo' className='mlb-1'>
              {organization.people?.map((contact) => (
                <ListItem key={contact.id}>
                  <ListItemEndcap className='flex items-center'>
                    <User className={getSize(5)} />
                  </ListItemEndcap>
                  <ListItemHeading className='text-sm pbs-1.5'>{contact.name}</ListItemHeading>
                </ListItem>
              ))}
            </List>
          )}
        </div>
      </ListItemHeading>
    </ListItem>
  );
});
