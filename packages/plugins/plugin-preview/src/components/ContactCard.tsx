//
// Copyright 2025 DXOS.org
//

import React, { Fragment } from 'react';

import { Icon, Avatar, Button } from '@dxos/react-ui';
import { Card, cardHeading, cardText } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { type PreviewProps } from '../types';

export const ContactCard = ({
  children,
  subject: { fullName, image, organization, emails },
  onOrgClick,
  role,
}: PreviewProps<DataType.Person> & { onOrgClick?: (org: DataType.Organization) => void }) => {
  const organizationName = organization && typeof organization === 'object' ? organization.target?.name : organization;
  return (
    <Card.SurfaceRoot role={role}>
      <Avatar.Root>
        <Card.Text role='group' classNames='grid gap-3 grid-cols-[min-content_1fr]'>
          <Avatar.Content imgSrc={image} icon='ph--user--regular' size={16} hue='neutral' />
          <div role='none' className='bs-min self-center'>
            <Avatar.Label asChild>
              <h2 className={cardHeading}>{fullName}</h2>
            </Avatar.Label>
          </div>
        </Card.Text>
      </Avatar.Root>
      {organizationName && (
        <Card.Chrome>
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
        </Card.Chrome>
      )}
      {emails?.length && (
        <dl
          className={mx(
            cardText,
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
      )}
      {children}
    </Card.SurfaceRoot>
  );
};
