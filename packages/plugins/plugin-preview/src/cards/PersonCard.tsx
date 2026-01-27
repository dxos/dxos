//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Avatar } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { type Person } from '@dxos/types';

import { type CardPreviewProps } from '../types';

export const PersonCard = ({ subject, onSelect }: CardPreviewProps<Person.Person>) => {
  const { fullName, image, organization: { target: organization } = {}, emails = [] } = subject;

  return (
    <Card.Content>
      <Avatar.Root>
        <Card.Content>
          <Card.Row>
            <Avatar.Label asChild>
              <Card.Heading>{fullName}</Card.Heading>
            </Avatar.Label>
          </Card.Row>
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
        </Card.Content>
      </Avatar.Root>
    </Card.Content>
  );
};
