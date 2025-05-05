//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Contact } from '@dxos/schema';

import { type PreviewProps, previewCard, previewTitle, previewProse } from '../types';

export const ContactCard = ({
  classNames,
  subject: { fullName, image, organization, emails },
}: PreviewProps<Contact>) => {
  const organizationName = organization && typeof organization === 'object' ? organization.target?.name : organization;
  return (
    <div role='none' className={mx('grid grid-cols-[6rem_1fr]', previewCard, classNames)}>
      {image ? (
        <img className='object-cover' src={image} alt={fullName} />
      ) : (
        <div role='image' className='grid bg-groupSurface place-items-center text-subdued'>
          <Icon icon='ph--user--regular' size={10} />
        </div>
      )}
      <div role='none'>
        <h2 className={mx(previewTitle, 'pli-3 mlb-3')}>{fullName}</h2>
        {organizationName && (
          <div className={mx(previewProse, 'flex gap-2 items-center')}>
            <Icon icon='ph--building-office--regular' size={5} classNames='text-subdued' />
            <p className='truncate'>{organizationName}</p>
          </div>
        )}
        {emails?.length && (
          <div className='flex flex-col'>
            {emails.map(({ label, value }) => (
              // TODO(burdon): Email tags.
              <p key={value} className='pli-3 mlb-3'>
                {value}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
