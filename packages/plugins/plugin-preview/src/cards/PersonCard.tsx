//
// Copyright 2025 DXOS.org
//

import React, { Fragment } from 'react';

import { Avatar, Icon } from '@dxos/react-ui';
import { Card, cardHeading, cardText } from '@dxos/react-ui-mosaic';
import { type Person } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { CardRow, CardSubjectMenu, gridRow } from '../components';
import { type CardPreviewProps } from '../types';

export const PersonCard = ({ children, role, subject, db, onSelect }: CardPreviewProps<Person.Person>) => {
  const { fullName, image, organization: { target: organization } = {}, emails = [] } = subject;

  return (
    <Card.SurfaceRoot id={subject.id} role={role}>
      <Avatar.Root>
        <Card.Text role='group' classNames={mx('grid gap-2 grid-cols-[1fr_min-content]')}>
          <div role='none' className={mx(gridRow, 'grid-rows-2')}>
            {db ? <CardSubjectMenu subject={subject} db={db} /> : <div />}
            <Avatar.Label asChild>
              <h2 className={mx(cardHeading, 'grow truncate')}>{fullName}</h2>
            </Avatar.Label>
          </div>
          <Avatar.Content
            imgSrc={image}
            icon='ph--user--regular'
            size={16}
            classNames={['text-subdued', !image && 'opacity-50']}
            hue='neutral'
            variant='square'
          />
        </Card.Text>
      </Avatar.Root>
      {organization?.name && (
        <CardRow
          icon='ph--buildings--regular'
          label={organization.name}
          onClick={onSelect ? () => onSelect(organization) : undefined}
        />
      )}
      {emails.length > 0 && (
        <dl className={mx(cardText, gridRow, '[&_dt]:text-subdued [&_dt]:pbs-0.5 [&_dd]:min-is-0')}>
          {emails.map(({ label, value }) => (
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
