//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { type Testing } from '@dxos/schema/testing';

export type ContactCardProps = { subject: Testing.Contact };

export const ContactCard = ({ subject: { name, image, organization, email } }: ContactCardProps) => {
  return (
    <div role='none' className='grid grid-cols-[6rem_1fr] is-72 overflow-hidden'>
      {image ? (
        <div className='grid'>
          <img className='h-full w-full object-cover' src={image} alt={name} />
        </div>
      ) : (
        <div role='image' className='grid bg-groupSurface place-items-center text-subdued'>
          <Icon icon='ph--user--regular' size={10} />
        </div>
      )}
      <div className='overflow-hidden'>
        <h2 className='font-medium text-lg line-clamp-2 pli-3 mlb-3'>{name}</h2>
        {organization?.target && (
          <div className='flex pli-3 mlb-3 gap-2 items-center'>
            <Icon icon='ph--building-office--regular' size={5} classNames='text-subdued' />
            <p className='truncate'>{organization.target?.name}</p>
          </div>
        )}
        {email && <p className='pli-3 mlb-3 truncate text-xs text-primary-500'>{email}</p>}
      </div>
    </div>
  );
};
