//
// Copyright 2022 DXOS.org
//

import { Buildings, User } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { List, ListItem } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Address, Organization } from '@dxos/kai-types';
import { Input } from '@dxos/react-appkit';
import { Space, useQuery } from '@dxos/react-client/echo';

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

export const OrganizationListItem: FC<{ organization: Organization }> = ({ organization }) => {
  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <ListItem.Root>
      <ListItem.Endcap>
        <Buildings className={mx(getSize(5), 'mbs-2.5')} />
      </ListItem.Endcap>
      <ListItem.Heading>
        <Input
          variant='subdued'
          label='Organization name'
          labelVisuallyHidden
          value={organization.name}
          onChange={({ target: { value } }) => (organization.name = value)}
          slots={{
            input: { spellCheck: false },
          }}
        />
        <div>
          {organization.address && <p className='text-sm text-gray-800'>{address(organization.address)}</p>}

          {/* Contacts */}
          {organization.people?.length > 0 && (
            <List density='fine' aria-labelledby='todo' classNames='mlb-1'>
              {organization.people?.map((contact) => (
                <ListItem.Root key={contact.id}>
                  <ListItem.Endcap classNames='flex items-center'>
                    <User className={getSize(5)} />
                  </ListItem.Endcap>
                  <ListItem.Heading classNames='text-sm pbs-1.5'>{contact.name}</ListItem.Heading>
                </ListItem.Root>
              ))}
            </List>
          )}
        </div>
      </ListItem.Heading>
    </ListItem.Root>
  );
};
