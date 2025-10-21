//
// Copyright 2025 DXOS.org
//

import React, { Fragment } from 'react';

import { Avatar, Button, Icon } from '@dxos/react-ui';
import { Card, cardHeading, cardText } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { type PreviewProps } from '../types';

import { CardSubjectMenu } from './CardSubjectMenu';

// TODO(burdon): Rename PersonCard.
export const ContactCard = ({ children, role, subject, activeSpace, onSelect }: PreviewProps<DataType.Person>) => {
  const { fullName, image, organization, emails } = subject;
  const organizationName = organization && typeof organization === 'object' ? organization.target?.name : organization;
  return (
    <Card.SurfaceRoot role={role}>
      <Avatar.Root>
        <Card.Text role='group' classNames='grid gap-3 grid-cols-[1fr_min-content]'>
          <div role='none' className='grid grid-cols-[20px_1fr] grid-rows-2 gap-2 items-center'>
            <CardSubjectMenu subject={subject} activeSpace={activeSpace} />
            <Avatar.Label asChild>
              <h2 className={mx(cardHeading, 'grow truncate')}>{fullName}</h2>
            </Avatar.Label>
          </div>
          <Avatar.Content imgSrc={image} icon='ph--user--regular' size={16} hue='neutral' variant='square' />
        </Card.Text>
      </Avatar.Root>
      {organizationName && (
        <Card.Chrome>
          {typeof organization === 'object' && onSelect ? (
            <Button variant='ghost' classNames='gap-2 text-start' onClick={() => onSelect(organization.target!)}>
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
            'grid grid-cols-[min-content_1fr] gap-2 [&_dt]:text-subdued [&_dt]:pbs-0.5 [&_dd]:min-is-0',
          )}
        >
          {emails?.length &&
            emails.map(({ label, value }) => (
              <Fragment key={value}>
                <dt>
                  <span className='sr-only'>{label}</span>
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
