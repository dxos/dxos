//
// Copyright 2022 DXOS.org
//

import { Buildings, User } from 'phosphor-react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Input, CardRow } from '../components';
import { Address, Organization } from '../proto';

export const OrganizationList: FC<{ space: Space }> = ({ space }) => {
  const organizations: Organization[] = useQuery(space, Organization.filter());

  return (
    <div className='mt-2'>
      {organizations.map((organization) => (
        <div key={organization[id]} className='border-b'>
          <OrganizationRow organization={organization} />
        </div>
      ))}
    </div>
  );
};

export const OrganizationRow: FC<{ organization: Organization }> = withReactor(({ organization }) => {
  const address = (address: Address) => `${address.city}, ${address.state} ${address.zip}`;

  return (
    <CardRow
      sidebar={
        <div className='flex shrink-0 justify-center w-6'>
          <Buildings className={getSize(5)} />
        </div>
      }
      header={
        <Input
          className='w-full p-1'
          spellCheck={false}
          value={organization.name}
          onChange={(value) => (organization.name = value)}
        />
      }
    >
      <div className='ml-9 mb-1'>
        {organization.address && <div className='flex text-sm text-gray-800'>{address(organization.address)}</div>}

        {/* Contacts */}
        {organization.people?.length > 0 && (
          <div className='pt-2'>
            <div className='p-1 pt-1'>
              {organization.people?.map((contact) => (
                <div className='flex items-center' key={contact[id]}>
                  <div className='pr-2'>
                    <User />
                  </div>
                  <div>{contact.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CardRow>
  );
});
