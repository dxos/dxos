//
// Copyright 2025 DXOS.org
//

import React, { Fragment } from 'react';

import { Avatar, Icon } from '@dxos/react-ui';
import { Card, cardHeading, cardText } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { CardSubjectMenu, GridRow, gridRow } from '../components';
import { type PreviewProps } from '../types';

// TODO(burdon): Rename PersonCard.
export const ContactCard = ({ children, role, subject, activeSpace, onSelect }: PreviewProps<DataType.Person>) => {
  const { fullName, image, organization: { target: organization } = {}, emails } = subject;

  return (
    <Card.SurfaceRoot role={role}>
      <Avatar.Root>
        <Card.Text role='group' classNames={mx('grid gap-2 grid-cols-[1fr_min-content]')}>
          <div role='none' className={mx(gridRow, 'grid-rows-2')}>
            {activeSpace ? <CardSubjectMenu subject={subject} activeSpace={activeSpace} /> : <div />}
            <Avatar.Label asChild>
              <h2 className={mx(cardHeading, 'grow truncate')}>{fullName}</h2>
            </Avatar.Label>
          </div>
          <Avatar.Content imgSrc={image} icon='ph--user--regular' size={16} hue='neutral' variant='square' />
        </Card.Text>
      </Avatar.Root>
      {organization?.name && (
        <Card.Chrome>
          <GridRow
            icon='ph--buildings--regular'
            label={organization.name}
            onClick={onSelect ? () => onSelect(organization) : undefined}
          />
        </Card.Chrome>
      )}
      {emails?.length && (
        <dl className={mx(cardText, gridRow, '[&_dt]:text-subdued [&_dt]:pbs-0.5 [&_dd]:min-is-0')}>
          {emails?.length &&
            emails.map(({ label, value }) => (
              <Fragment key={value}>
                <dt>
                  <span className='sr-only'>{label}</span>
                  <Icon icon='ph--at--regular' size={5} />
                </dt>
                <dd key={value} className='col-span-2 break-words'>
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
