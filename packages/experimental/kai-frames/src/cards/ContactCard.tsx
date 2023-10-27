//
// Copyright 2023 DXOS.org
//

import { ArrowCircleRight, Buildings, UserCircle, UserCirclePlus } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Contact } from '@dxos/kai-types';

import { AddressSection, Card, CardProps, CardRow } from './Card';

export const ContactCard = ({ slots = {}, object, selected, temporary, onSelect, onAction }: CardProps<Contact>) => {
  const name = object.name ?? object.email;

  return (
    <Card slots={slots}>
      <CardRow
        gutter={
          <Button variant='ghost' onClick={() => onSelect?.(object)}>
            {(temporary && <UserCirclePlus weight='thin' className={getSize(6)} />) || (
              <UserCircle className={mx(getSize(6), 'text-sky-600')} />
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
        <div className='text-lg'>{name}</div>
      </CardRow>

      {(object.email !== name || object.username !== undefined) && (
        <CardRow>
          <div className='flex flex-col text-sm'>
            {object.email && object.email !== name && <div className='text-sky-700'>{object.email}</div>}
            {object.username && <div className='text-sky-700'>{object.username}</div>}
            {object.phone && <div>{object.phone}</div>}
          </div>
        </CardRow>
      )}

      {object.address && (
        <CardRow>
          <AddressSection address={object.address} />
        </CardRow>
      )}

      {/* TODO(burdon): Link. */}
      {object.employer && (
        <CardRow
          gutter={
            <Button variant='ghost'>
              <Buildings className={getSize(6)} />
            </Button>
          }
        >
          {object.employer.name}
        </CardRow>
      )}
    </Card>
  );
};
