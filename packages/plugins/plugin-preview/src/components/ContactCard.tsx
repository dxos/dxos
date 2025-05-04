//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { type Contact } from '@dxos/schema';

export type ContactCardProps = { subject: Contact };

export const ContactCard = ({ subject: { fullName, image, organization, emails } }: ContactCardProps) => {
  const organizationName = organization && typeof organization === 'object' ? organization.target?.name : organization;
  return (
    <div role='none' className='grid grid-cols-[6rem_1fr] is-72 overflow-hidden'>
      {image ? (
        <div className='grid'>
          <img className='h-full w-full object-cover' src={image} alt={fullName} />
        </div>
      ) : (
        <div role='image' className='grid bg-groupSurface place-items-center text-subdued'>
          <Icon icon='ph--user--regular' size={10} />
        </div>
      )}
      <div className='overflow-hidden'>
        <h2 className='font-medium text-lg line-clamp-2 pli-3 mlb-3'>{fullName}</h2>
        {organizationName && (
          <div className='flex pli-3 mlb-3 gap-2 items-center'>
            <Icon icon='ph--building-office--regular' size={5} classNames='text-subdued' />
            <p className='truncate'>{organizationName}</p>
          </div>
        )}
        {emails?.length && (
          <div className='flex flex-col'>
            {emails.map(({ label, value }) => (
              // TODO(burdon): Email tags.
              <p key={value} className='pli-3 mlb-3 truncate text-xs text-primary-500'>
                {value}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
