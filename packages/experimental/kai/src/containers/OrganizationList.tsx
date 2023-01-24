//
// Copyright 2022 DXOS.org
//

import { Buildings } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Input, CardRow } from '../components';
import { useSpace } from '../hooks';
import { Address, Organization } from '../proto';

export const OrganizationList: FC = () => {
  const space = useSpace();
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
        <div className='flex flex-shrink-0 justify-center w-6'>
          <Buildings className={getSize(5)} />
        </div>
      }
      header={
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={organization.name}
          onChange={(value) => (organization.name = value)}
        />
      }
    >
      <div className='ml-8 mb-1'>
        {organization.address && <div className='flex text-sm text-gray-800'>{address(organization.address)}</div>}
      </div>
    </CardRow>
  );
});
