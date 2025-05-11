//
// Copyright 2025 DXOS.org
//

import React, { Fragment } from 'react';

import { Icon, Avatar, Button } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { type PreviewProps, popoverCard, previewTitle, previewProse, previewChrome, defaultCard } from '../types';

export const ContactCard = ({
  children,
  classNames,
  role,
  subject: { fullName, image, organization, emails },
  onOrgClick,
}: PreviewProps<DataType.Contact> & { onOrgClick?: (org: DataType.Organization) => void }) => {
  const organizationName = organization && typeof organization === 'object' ? organization.target?.name : organization;
  return (
    <div role='none' className={mx(role === 'popover' ? popoverCard : defaultCard, classNames)}>
      <Avatar.Root>
        <div role='group' className={mx(previewProse, 'grid gap-3 grid-cols-[min-content_1fr]')}>
          <Avatar.Content imgSrc={image} icon='ph--user--regular' size={16} hue='neutral' />
          <div role='none' className='bs-min self-center'>
            <Avatar.Label asChild>
              <h2 className={previewTitle}>{fullName}</h2>
            </Avatar.Label>
          </div>
        </div>
      </Avatar.Root>
      {organizationName && (
        <div role='none' className={previewChrome}>
          {typeof organization === 'object' && onOrgClick ? (
            <Button variant='ghost' classNames='gap-2 text-start' onClick={() => onOrgClick(organization.target!)}>
              <Icon icon='ph--buildings--regular' size={5} classNames='text-subdued' />
              <span className='min-is-0 flex-1 truncate'>{organizationName}</span>
              <Icon icon='ph--arrow-right--regular' />
            </Button>
          ) : (
            <p className='dx-button gap-2' data-variant='ghost'>
              <Icon icon='ph--buildings--regular' size={5} classNames='text-subdued' />
              <span className='min-is-0 flex-1 truncate'>{organizationName}</span>
            </p>
          )}
        </div>
      )}
      <dl
        className={mx(
          previewProse,
          'grid gap-2 grid-cols-[min-content_1fr] [&_dt]:text-subdued [&_dt]:pbs-0.5 [&_dd]:min-is-0',
        )}
      >
        {emails?.length &&
          emails.map(({ label, value }) => (
            <Fragment key={value}>
              <dt>
                <Icon icon='ph--at--regular' size={5} />
              </dt>
              <dd key={value} className='break-words'>
                {value}
              </dd>
            </Fragment>
          ))}
      </dl>
      {children}
    </div>
  );
};
