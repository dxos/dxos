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
        <dl
          className={mx(
            previewProse,
            'grid gap-2 grid-cols-[min-content_1fr] [&_dt]:text-subdued [&_dt]:pbs-0.5 [&_dd]:min-is-0',
          )}
        >
          {organizationName && (
            <>
              <dt>
                <Icon icon='ph--buildings--regular' size={5} />
              </dt>
              <dd className='truncate'>{organizationName}</dd>
            </>
          )}
          {emails?.length &&
            emails.map(({ label, value }) => (
              <>
                <dt>
                  <Icon icon='ph--at--regular' size={5} />
                </dt>
                <dd key={value} className='break-words'>
                  {value}
                </dd>
              </>
            ))}
        </dl>
      </div>
    </div>
  );
};
