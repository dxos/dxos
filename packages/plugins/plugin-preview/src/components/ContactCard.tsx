//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon, Avatar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Contact } from '@dxos/schema';

import { type PreviewProps, previewCard, previewTitle, previewProse } from '../types';

export const ContactCard = ({
  classNames,
  subject: { fullName, image, organization, emails },
}: PreviewProps<Contact>) => {
  const organizationName = organization && typeof organization === 'object' ? organization.target?.name : organization;
  return (
    <div role='none' className={mx(previewCard, classNames)}>
      <div role='group' className={mx(previewProse, 'grid gap-3 grid-cols-[min-content_1fr]')}>
        <Avatar.Root>
          <Avatar.Content imgSrc={image} icon='ph--user--regular' size={16} />
        </Avatar.Root>
        <div role='none' className='bs-min self-center'>
          <h2 className={previewTitle}>{fullName}</h2>
          {organizationName && (
            <p className='flex items-center gap-2'>
              <Icon icon='ph--buildings--regular' size={5} classNames='text-subdued' />
              <span className='truncate'>{organizationName}</span>
            </p>
          )}
        </div>
      </div>
      <dl
        className={mx(
          previewProse,
          'grid gap-2 grid-cols-[min-content_1fr] [&_dt]:text-subdued [&_dt]:pbs-0.5 [&_dd]:min-is-0',
        )}
      >
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
  );
};
