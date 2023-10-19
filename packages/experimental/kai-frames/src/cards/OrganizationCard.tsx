//
// Copyright 2023 DXOS.org
//

import { ArrowCircleRight, Buildings, UserCirclePlus } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Organization } from '@dxos/kai-types';

import { AddressSection, Card, CardProps, CardRow } from './Card';

export const OrganizationCard = ({
  slots = {},
  object,
  selected,
  temporary,
  onSelect,
  onAction,
}: CardProps<Organization>) => {
  return (
    <Card slots={slots}>
      <CardRow
        gutter={
          <Button variant='ghost' onClick={() => onSelect?.(object)}>
            {(temporary && <UserCirclePlus weight='thin' className={getSize(6)} />) || (
              <Buildings className={mx(getSize(6), 'text-sky-600')} />
            )}
          </Button>
        }
        action={
          onAction && (
            <Button variant='ghost' onClick={() => onAction?.(object)}>
              <ArrowCircleRight className={getSize(6)} />
            </Button>
          )
        }
      >
        <div className='text-lg'>{object.name}</div>
      </CardRow>

      {object.website && (
        <CardRow>
          <div className='flex flex-col text-sm'>
            {object.website && <div className='text-sky-700'>{object.website}</div>}
          </div>
        </CardRow>
      )}

      {object.address && (
        <CardRow>
          <AddressSection address={object.address} />
        </CardRow>
      )}
    </Card>
  );
};
