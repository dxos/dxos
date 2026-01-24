//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Avatar } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { type Person } from '@dxos/types';

import { type CardPreviewProps } from '../types';

export const PersonCard = ({ children, role, subject, onSelect }: CardPreviewProps<Person.Person>) => {
  const { fullName, image, organization: { target: organization } = {}, emails = [] } = subject;

  return (
    <Card.Root id={subject.id} role={role}>
      <Avatar.Root>
        <Card.Toolbar>
          <Card.Icon toolbar icon='ph--user--regular' />
          <Avatar.Label asChild>
            <h2 className='grow truncate'>{fullName}</h2>
          </Avatar.Label>
          {/* TODO(burdon): Menu. */}
          <Card.Close onClose={() => {}} />
        </Card.Toolbar>

        <Card.Content>
          {image && (
            <Card.Row className='plb-1'>
              <Avatar.Content
                imgSrc={image}
                icon='ph--user--regular'
                size={16}
                classNames={!image && 'opacity-50'}
                hue='neutral'
                variant='square'
              />
            </Card.Row>
          )}
          {organization?.name && (
            <Card.Action
              icon='ph--buildings--regular'
              label={organization.name}
              onClick={onSelect ? () => onSelect(organization) : undefined}
            />
          )}
          {emails.map(({ value }) => (
            <Card.Row key={value} icon='ph--at--regular'>
              <Card.Text truncate className='text-primaryText'>
                {value}
              </Card.Text>
            </Card.Row>
          ))}
          {children}
        </Card.Content>
      </Avatar.Root>
    </Card.Root>
  );
};
